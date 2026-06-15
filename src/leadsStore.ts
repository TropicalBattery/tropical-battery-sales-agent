import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import { log } from "./logger.js";
import type { ScoredLead, CallSession, LeadDraft } from "./types.js";
import { scoreLead } from "./leadScore.js";

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


/** After-hours voicemail → a lead with the recording + caller number (rep listens). */
export async function insertVoicemailLead(opts: { phone?: string; recordingUrl?: string; callSid: string }): Promise<string | null> {
  const draft: LeadDraft = {
    caller_phone: opts.phone,
    product_need: "After-hours voicemail",
    notes_summary: "After-hours voicemail — listen to the recording; transcription may follow.",
    source: "inbound-call-afterhours-voicemail",
  };
  const scored = scoreLead(draft);
  const sb = db();
  if (!sb) { log.warn("leads DB not configured; voicemail lead not persisted"); return null; }
  const { data, error } = await sb.from("leads")
    .insert({ ...scored, recording_url: opts.recordingUrl, call_sid: opts.callSid })
    .select("id").single();
  if (error) { log.error("insertVoicemailLead failed", error.message); return null; }
  log.info("voicemail lead captured", { id: data?.id });
  return data?.id ?? null;
}

/** Best-effort: enrich a voicemail lead once Twilio posts its transcription. */
export async function updateLeadTranscription(callSid: string, transcription: string): Promise<void> {
  const sb = db();
  if (!sb || !transcription) return;
  const { error } = await sb.from("leads")
    .update({ notes_summary: `After-hours voicemail: ${transcription.slice(0, 480)}` })
    .eq("call_sid", callSid);
  if (error) log.error("updateLeadTranscription failed", error.message);
}
