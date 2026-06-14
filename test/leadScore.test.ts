import { describe, it, expect } from "vitest";
import { scoreLead } from "../src/leadScore.js";

describe("leadScore", () => {
  it("scores a hot, urgent battery lead", () => {
    const s = scoreLead({
      caller_phone: "+18765551234", product_need: "car battery replacement",
      urgency: "dead now, stranded", budget_range: "15-25k JMD",
      branch_of_interest: "Montego Bay", vehicle_or_equipment: "2015 Corolla",
    });
    expect(s.lead_temperature).toBe("hot");
    expect(s.lead_score).toBeGreaterThanOrEqual(12);
    expect(s.routing).toBe("sales-immediate");
  });

  it("scores a vague low-intent enquiry as cool/unqualified", () => {
    const s = scoreLead({ product_need: "just asking about prices" });
    expect(["cool", "unqualified"]).toContain(s.lead_temperature);
    expect(s.lead_score).toBeLessThan(8);
  });
});
