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
