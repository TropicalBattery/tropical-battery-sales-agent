import { describe, it, expect } from "vitest";
import { localParts, repsWorking, callbackPlan } from "../src/hours.js";

// Jamaica is UTC-5 year-round.
const at = (iso: string) => new Date(iso);

describe("hours", () => {
  it("computes Jamaica-local dow/hour", () => {
    // 2026-06-13 is a Saturday. 15:00 UTC => 10:00 Jamaica.
    const p = localParts(at("2026-06-13T15:00:00Z"));
    expect(p.dow).toBe(6);
    expect(p.hour).toBe(10);
  });

  it("reps are off on Saturday (placeholder rule)", () => {
    expect(repsWorking(at("2026-06-13T15:00:00Z"))).toBe(false);
  });

  it("reps working on a weekday midday", () => {
    // 2026-06-15 Monday, 17:00 UTC => 12:00 Jamaica.
    expect(repsWorking(at("2026-06-15T17:00:00Z"))).toBe(true);
  });

  it("weekend call -> Monday callback + weekend source", () => {
    const plan = callbackPlan(at("2026-06-13T15:00:00Z"));
    expect(plan.routingTag).toBe("sales-next-business-day");
    expect(plan.sourceTag).toBe("inbound-call-weekend");
    expect(plan.callbackPhrase).toMatch(/Monday/);
  });

  it("in-hours call -> immediate", () => {
    const plan = callbackPlan(at("2026-06-15T17:00:00Z"));
    expect(plan.routingTag).toBe("sales-immediate");
  });
});

import { agentActive, agentWindow } from "../src/hours.js";

describe("agent window", () => {
  it("active Saturday midday (store open)", () => {
    expect(agentActive(at("2026-06-13T15:00:00Z"))).toBe(true); // Sat 10:00 JM
  });
  it("inactive on Sunday (store closed)", () => {
    expect(agentActive(at("2026-06-14T17:00:00Z"))).toBe(false); // Sun 12:00 JM
  });
  it("active 1h before open (5am with 6am open)", () => {
    // Mon 05:30 JM = 10:30 UTC
    expect(agentActive(at("2026-06-15T10:30:00Z"))).toBe(true);
  });
  it("inactive after close+1h (6pm)", () => {
    // Mon 18:30 JM = 23:30 UTC
    expect(agentActive(at("2026-06-15T23:30:00Z"))).toBe(false);
  });
  it("window is store hours padded by 1h", () => {
    expect(agentWindow(1)).toEqual([5, 18]); // [6-1, 17+1] with default 6am open
  });
});
