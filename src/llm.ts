import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

export type LlmEvent =
  | { kind: "text"; text: string }
  | { kind: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { kind: "stop"; stopReason: string; assistantContent: unknown };

export interface LlmRunParams {
  system: string;
  tools: Anthropic.Tool[];
  messages: Anthropic.MessageParam[];
}

/** Pluggable so tests can inject a scripted model. */
export interface LlmClient {
  run(params: LlmRunParams): AsyncGenerator<LlmEvent>;
}

export class AnthropicLlm implements LlmClient {
  private client: Anthropic | null = null;
  private get(): Anthropic {
    if (!this.client) this.client = new Anthropic({ apiKey: config.anthropic.apiKey });
    return this.client;
  }
  async *run(params: LlmRunParams): AsyncGenerator<LlmEvent> {
    const stream = this.get().messages.stream({
      model: config.anthropic.model,
      max_tokens: 512,
      system: params.system,
      tools: params.tools,
      messages: params.messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { kind: "text", text: event.delta.text };
      }
    }

    const final = await stream.finalMessage();
    for (const block of final.content) {
      if (block.type === "tool_use") {
        yield { kind: "tool_use", id: block.id, name: block.name, input: (block.input ?? {}) as Record<string, unknown> };
      }
    }
    yield { kind: "stop", stopReason: final.stop_reason ?? "end_turn", assistantContent: final.content };
  }
}
