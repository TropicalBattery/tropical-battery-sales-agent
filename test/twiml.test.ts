import { describe, it, expect } from "vitest";
import { buildVoiceTwiml } from "../src/twiml.js";

const satMidday = new Date("2026-06-13T15:00:00Z"); // Sat 10:00 JM — inside window
const sunday    = new Date("2026-06-14T17:00:00Z"); // Sun 12:00 JM — store closed

describe("twiml", () => {
  it("inside the window: ConversationRelay with Max's voice", () => {
    const xml = buildVoiceTwiml(satMidday);
    expect(xml).toContain("<Connect>");
    expect(xml).toContain("ConversationRelay");
    expect(xml).toMatch(/url="wss:/);
  });

  it("outside the window (Sunday): closed message + voicemail capture, no ConversationRelay", () => {
    const xml = buildVoiceTwiml(sunday);
    expect(xml).toContain("<Say>");
    expect(xml).toContain("<Record");
    expect(xml).toContain('action="/voicemail"');
    expect(xml).not.toContain("ConversationRelay");
  });
});
