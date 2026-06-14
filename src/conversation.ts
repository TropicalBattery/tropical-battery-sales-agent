import type Anthropic from "@anthropic-ai/sdk";
import type { CallSession, RelayOutbound } from "./types.js";
import type { LlmClient } from "./llm.js";
import { toolDefs, dispatchTool } from "./tools/index.js";
import { buildSystemPrompt } from "./prompt/systemPrompt.js";
import { log } from "./logger.js";

type Send = (msg: RelayOutbound) => void;

/**
 * Drive one user turn end-to-end: stream Claude's text to Twilio, run any tool
 * calls, feed results back, and loop until Claude finishes — then send last:true.
 */
export async function handlePrompt(
  session: CallSession,
  userText: string,
  send: Send,
  llm: LlmClient,
): Promise<void> {
  session.interrupted = false;
  session.history.push({ role: "user", content: userText });

  const system = buildSystemPrompt();
  let guard = 0;

  while (guard++ < 6) {
    const messages = session.history.map((t) => ({ role: t.role, content: t.content })) as Anthropic.MessageParam[];
    const toolUses: { id: string; name: string; input: Record<string, unknown> }[] = [];
    let stopReason = "end_turn";
    let assistantContent: unknown = "";

    for await (const ev of llm.run({ system, tools: toolDefs, messages })) {
      if (session.interrupted) { send({ type: "interrupt" }); return; }
      if (ev.kind === "text") {
        if (ev.text) send({ type: "text", token: ev.text, last: false });
      } else if (ev.kind === "tool_use") {
        toolUses.push({ id: ev.id, name: ev.name, input: ev.input });
      } else {
        stopReason = ev.stopReason;
        assistantContent = ev.assistantContent;
      }
    }

    session.history.push({ role: "assistant", content: assistantContent });

    if (stopReason === "tool_use" && toolUses.length) {
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        let out = "Tool error.";
        try { out = await dispatchTool(tu.name, tu.input, session); }
        catch (e) { log.error("tool failed", { name: tu.name, err: String(e) }); }
        results.push({ type: "tool_result", tool_use_id: tu.id, content: out });
      }
      session.history.push({ role: "user", content: results });
      continue; // let Claude speak its follow-up
    }
    break;
  }

  send({ type: "text", token: "", last: true });
}
