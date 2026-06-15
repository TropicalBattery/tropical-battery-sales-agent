import assert from "node:assert";
import { callbackPlan, repsWorking, agentActive } from "../src/hours.js";
import { scoreLead } from "../src/leadScore.js";
import { buildVoiceTwiml } from "../src/twiml.js";
import { buildSystemPrompt } from "../src/prompt/systemPrompt.js";

let pass = 0;
const ok = (name: string, cond: boolean) => { assert(cond, `FAIL: ${name}`); console.log(`  ok  ${name}`); pass++; };

const sat = new Date("2026-06-13T15:00:00Z"); // Sat 10:00 JM
const mon = new Date("2026-06-15T17:00:00Z"); // Mon 12:00 JM

ok("reps off Saturday", repsWorking(sat) === false);
ok("reps on Monday midday", repsWorking(mon) === true);
ok("weekend -> Monday callback", /Monday/.test(callbackPlan(sat).callbackPhrase));
ok("hot lead scores >=12", scoreLead({ caller_phone: "+1", product_need: "battery", urgency: "dead now", budget_range: "20k", branch_of_interest: "MoBay" }).lead_score >= 12);
ok("agent active Sat midday", agentActive(sat) === true);
ok("agent inactive Sunday", agentActive(new Date("2026-06-14T17:00:00Z")) === false);
ok("twiml (in-window) has ConversationRelay", buildVoiceTwiml(sat).includes("ConversationRelay"));
ok("twiml (Sunday) is closed message", buildVoiceTwiml(new Date("2026-06-14T17:00:00Z")).includes("Hangup"));
ok("system prompt names branches + guardrails", /Montego Bay/.test(buildSystemPrompt()) && /NEVER quote firm prices/.test(buildSystemPrompt()));

console.log(`\nSMOKE OK — ${pass} checks passed`);
