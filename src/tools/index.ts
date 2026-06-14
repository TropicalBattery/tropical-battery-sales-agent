import type Anthropic from "@anthropic-ai/sdk";
import { checkAvailability } from "../inventory.js";
import { insertLead } from "../leadsStore.js";
import { scoreLead } from "../leadScore.js";
import { callbackPlan } from "../hours.js";
import { BRANCHES } from "../config.js";
import type { CallSession, LeadDraft } from "../types.js";

/** Anthropic tool definitions exposed to Claude during the call. */
export const toolDefs: Anthropic.Tool[] = [
  {
    name: "answer_faq",
    description:
      "Answer a factual question about Tropical Battery: locations/branches, services, brands carried, " +
      "warranty basics, or the mobile roadside service. Use for 'where are you', 'what do you sell', 'do you install'.",
    input_schema: {
      type: "object",
      properties: {
        topic: { type: "string", enum: ["branches", "services", "brands", "warranty", "mobile_response", "hours"] },
      },
      required: ["topic"],
    },
  },
  {
    name: "check_product_availability",
    description:
      "Check whether a product type is likely in stock and at which branch. Use for 'do you have X'. " +
      "Returns SOFT availability only (a rep confirms exact stock) — never quote exact unit counts or prices.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Product term, e.g. 'car battery', 'solar inverter', 'tyre'." },
        branch_code: { type: "string", enum: BRANCHES.map((b) => b.code), description: "Optional branch filter." },
      },
      required: ["query"],
    },
  },
  {
    name: "capture_lead",
    description:
      "Save the qualified lead. Call this once you have gathered enough detail (always include caller_phone " +
      "and at least product_need + a way to follow up). This is the structured sink — fill every field you know.",
    input_schema: {
      type: "object",
      properties: {
        caller_phone: { type: "string" },
        name: { type: "string" },
        vehicle_or_equipment: { type: "string", description: "make / model / year, or equipment type" },
        product_need: { type: "string" },
        urgency: { type: "string" },
        budget_range: { type: "string" },
        branch_of_interest: { type: "string" },
        preferred_callback: { type: "string" },
        notes_summary: { type: "string", description: "1–2 sentence summary for the rep" },
      },
      required: ["product_need", "notes_summary"],
    },
  },
  {
    name: "book_callback",
    description:
      "Confirm the callback time the caller wants. Call after capture_lead (or alongside) to set the preferred " +
      "callback window. The system decides Monday vs next-business-day automatically based on call time.",
    input_schema: {
      type: "object",
      properties: { preferred_callback: { type: "string" }, branch_of_interest: { type: "string" } },
      required: ["preferred_callback"],
    },
  },
];

/** Execute a tool call and return a string result Claude can speak from. */
export async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
  session: CallSession,
): Promise<string> {
  switch (name) {
    case "answer_faq":
      return faq(String(input.topic ?? ""));

    case "check_product_availability": {
      const res = await checkAvailability(String(input.query ?? ""), input.branch_code as string | undefined);
      if (!res || !res.anyStock) {
        return "I couldn't confirm live stock for that, so the safest thing is to capture the details and have a rep verify. Don't promise stock.";
      }
      const top = res.branches.slice(0, 3)
        .map((b) => `${b.branch_name} (e.g. ${b.sample.join(", ")})`)
        .join("; ");
      return `Soft availability for "${res.term}" — looks stocked at: ${top}. Tell the caller it looks available there but a rep will confirm exact stock. Do not state unit counts or prices.`;
    }

    case "capture_lead": {
      const plan = callbackPlan();
      const draft: LeadDraft = {
        caller_phone: (input.caller_phone as string) || session.from,
        name: input.name as string,
        vehicle_or_equipment: input.vehicle_or_equipment as string,
        product_need: input.product_need as string,
        urgency: input.urgency as string,
        budget_range: input.budget_range as string,
        branch_of_interest: input.branch_of_interest as string,
        preferred_callback: input.preferred_callback as string,
        notes_summary: input.notes_summary as string,
        source: plan.sourceTag,
      };
      const scored = scoreLead(draft);
      // Hours override the routing *timing* for non-nurture leads.
      if (scored.routing !== "nurture") scored.routing = plan.routingTag;
      session.lead = draft;
      const id = await insertLead(scored, session.callSid);
      session.captured = true;
      return id
        ? `Lead saved (${scored.lead_temperature}, score ${scored.lead_score}). Tell the caller: "${plan.callbackPhrase}". Then confirm what happens next and close warmly.`
        : `Lead recorded locally. Tell the caller: "${plan.callbackPhrase}".`;
    }

    case "book_callback": {
      const plan = callbackPlan();
      session.lead.preferred_callback = input.preferred_callback as string;
      if (input.branch_of_interest) session.lead.branch_of_interest = input.branch_of_interest as string;
      return `Callback noted for "${input.preferred_callback}". ${plan.callbackPhrase}. Confirm this with the caller.`;
    }

    default:
      return "Unknown tool.";
  }
}

function faq(topic: string): string {
  switch (topic) {
    case "branches":
      return "Six retail branches: " + BRANCHES.map((b) => `${b.name} ${b.phone}`).join("; ") +
        ". HQ is Ferry, Kingston. Offer the nearest one and ask which is convenient.";
    case "services":
      return "At branches: battery installation, FREE battery & electrical testing, charging, repairs, " +
        "warranty claim & activation, tyre installation & balancing, expert advice.";
    case "brands":
      return "Own brands Rose (batteries) and Caribrake (brake fluid); also carry Armor All and STP. " +
        "Full battery brand line-up isn't confirmed — if asked for a specific brand, capture the lead and let a rep confirm.";
    case "warranty":
      return "Batteries carry a warranty; branches handle warranty claim & activation. Give general reassurance, " +
        "don't quote exact terms — a rep confirms specifics.";
    case "mobile_response":
      return "Island-wide Mobile Response (roadside): 1-888-767-4225 — jumpstarts, on-site battery checks, " +
        "diagnostics, and battery replacement where you are.";
    case "hours":
      return "HOURS NOT YET CONFIRMED (pending from the business). Don't state specific opening hours. Say a rep will " +
        "confirm hours, and that you can take their details now so the team follows up.";
    default:
      return "No FAQ entry; gather the detail and capture the lead.";
  }
}
