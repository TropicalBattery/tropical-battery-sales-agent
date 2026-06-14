import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import { log } from "./logger.js";
import type { ScoredLead, CallSession } from "./types.js";

let client: any = null;
function db(): any {
  if (config.leadsDb.url && config.leadsDb.serviceKey && !client) {
    client = createClient(config.leadsDb.url, config.leadsDb.serviceKey, {
      db: { schema: config.leadsDb.schema },
    });
  }
  return client;
}

export async function insertLead(lead: ScoredLead, callSid: string): Promise<string | null> {
  const sb = db();
  if (!sb) { log.warn("leads DB not configured; lead not persisted", { name: lead.name }); return null; }
  const { data, error } = await sb.from("leads").insert({ ...lead, call_sid: callSid }).select("id").single();
  if (error) { log.error("insertLead failed", error.message); return null; }
  log.info("lead captured", { id: data?.id, temp: lead.lead_temperature, score: lead.lead_score });
  return data?.id ?? null;
}

export async function insertCallLog(session: CallSession, endedReason: string): Promise<void> {
  const sb = db();
  if (!sb) return;
  const transcript = session.history.map((t) => ({
    role: t.role,
    text: typeof t.content === "string" ? t.content : JSON.stringify(t.content),
  }));
  const { error } = await sb.from("call_logs").insert({
    call_sid: session.callSid,
    caller_phone: session.from,
    transcript,
    duration_seconds: Math.round((Date.now() - session.startedAt) / 1000),
    ended_reason: endedReason,
    recorded: config.recordCalls,
  });
  if (error) log.error("insertCallLog failed", error.message);
}
