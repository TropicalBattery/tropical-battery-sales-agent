import type { LeadDraft, ScoredLead } from "./types.js";

/**
 * Retail-adapted BANT (0–15). Tuned for a battery/auto/energy walk-up sale, where
 * "Authority" matters less than clear Need + Urgency + a reachable contact.
 */
export function scoreLead(d: LeadDraft): ScoredLead {
  const need = d.product_need ? (/(\bbattery\b|solar|tyre|tire|inverter|oil|brake|coolant)/i.test(d.product_need) ? 3 : 2) : 0;

  const u = (d.urgency ?? "").toLowerCase();
  const urgency = /(now|today|dead|stranded|won'?t start|asap|urgent)/.test(u) ? 3
    : /(this week|few days|soon)/.test(u) ? 2
    : u ? 1 : 0;

  const budget = d.budget_range ? (/(unsure|not sure|don'?t know|—|n\/?a)/i.test(d.budget_range) ? 1 : 2) : 0;

  const fit = d.branch_of_interest ? 3 : (d.vehicle_or_equipment ? 2 : 1);

  const contact = (d.caller_phone || d.preferred_callback) ? 3 : 0;

  const raw = need + urgency + budget + fit + contact; // 0..15
  const score = Math.max(0, Math.min(15, raw));

  const temperature: ScoredLead["lead_temperature"] =
    score >= 12 ? "hot" : score >= 8 ? "warm" : score >= 4 ? "cool" : "unqualified";

  // Routing here reflects lead quality; final callback *timing* comes from hours.callbackPlan().
  const routing: ScoredLead["routing"] =
    temperature === "hot" ? "sales-immediate"
    : temperature === "unqualified" ? "nurture"
    : "sales-next-business-day";

  return { ...d, lead_score: score, lead_temperature: temperature, routing };
}
