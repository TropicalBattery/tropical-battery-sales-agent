import { describe, it, expect } from "vitest";
import { buildVoiceTwiml } from "../src/twiml.js";

describe("twiml", () => {
  it("emits a ConversationRelay connect with our WS url", () => {
    const xml = buildVoiceTwiml();
    expect(xml).toContain("<Connect>");
    expect(xml).toContain("ConversationRelay");
    expect(xml).toMatch(/url="wss:/);
    expect(xml).toContain("Tropical Battery");
  });
});
