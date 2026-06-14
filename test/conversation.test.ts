import { describe, it, expect, vi } from "vitest";
import { handlePrompt } from "../src/conversation.js";
import type { LlmClient, LlmEvent } from "../src/llm.js";
import type { CallSession, RelayOutbound } from "../src/types.js";

// Mock the leads store + inventory so capture_lead runs without network.
vi.mock("../src/leadsStore.js", () => ({
  insertLead: vi.fn(async () => "test-id"),
  insertCallLog: vi.fn(async () => {}),
}));
vi.mock("../src/inventory.js", () => ({ checkAvailability: vi.fn(async () => null) }));

function session(): CallSession {
  return { callSid: "CA1", from: "+18765550000", startedAt: Date.now(), history: [], lead: {}, captured: false, interrupted: false };
}

// Scripted model: first turn calls capture_lead, second turn says a closing line.
function scriptedLlm(): LlmClient {
  let turn = 0;
  return {
    async *run(): AsyncGenerator<LlmEvent> {
      turn++;
      if (turn === 1) {
        yield { kind: "text", text: "Got it — let me note that down. " };
        yield { kind: "tool_use", id: "t1", name: "capture_lead", input: { product_need: "car battery", notes_summary: "Battery dead, needs replacement", caller_phone: "+18765550000" } };
        yield { kind: "stop", stopReason: "tool_use", assistantContent: [{ type: "text", text: "Got it — let me note that down. " }, { type: "tool_use", id: "t1", name: "capture_lead", input: {} }] };
      } else {
        yield { kind: "text", text: "A rep will call you Monday. Thanks for calling Tropical Battery!" };
        yield { kind: "stop", stopReason: "end_turn", assistantContent: "A rep will call you Monday. Thanks for calling Tropical Battery!" };
      }
    },
  };
}

describe("conversation orchestrator", () => {
  it("streams text, runs the tool, loops, and ends with last:true", async () => {
    const sent: RelayOutbound[] = [];
    const s = session();
    await handlePrompt(s, "my battery is dead", (m) => sent.push(m), scriptedLlm());

    const texts = sent.filter((m) => m.type === "text") as Extract<RelayOutbound, { type: "text" }>[];
    expect(texts.some((t) => /note that down/.test(t.token))).toBe(true);
    expect(texts.some((t) => /rep will call you Monday/.test(t.token))).toBe(true);
    expect(texts.at(-1)).toEqual({ type: "text", token: "", last: true });
    expect(s.captured).toBe(true);
  });
});
