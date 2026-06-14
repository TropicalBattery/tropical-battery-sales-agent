import assert from "node:assert";
import { callbackPlan, repsWorking } from "../src/hours.js";
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
ok("twiml has ConversationRelay", buildVoiceTwiml().includes("ConversationRelay"));
ok("system prompt names branches + guardrails", /Montego Bay/.test(buildSystemPrompt()) && /NEVER quote firm prices/.test(buildSystemPrompt()));

console.log(`\nSMOKE OK — ${pass}/6 checks passed`);
