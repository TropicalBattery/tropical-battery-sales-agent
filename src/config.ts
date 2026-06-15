import "dotenv/config";

/** Customer-facing branches. Codes map 1:1 to inventory_balances.location_code. */
export const BRANCHES = [
  { name: "Ferry (Kingston)",        code: "FERRY",     region: "Kingston",   phone: "(876) 923-6231-3" },
  { name: "Grove Road (Kingston)",   code: "GROVE",     region: "Kingston",   phone: "(876) 926-6615" },
  { name: "Ashenheim Road (Kingston)", code: "ASH",     region: "Kingston",   phone: "(876) 923-6231" },
  { name: "Ocho Rios",               code: "OCHO-RIOS", region: "St. Ann",    phone: "(876) 974-8777-8" },
  { name: "Montego Bay",             code: "MOBAY",     region: "St. James",  phone: "(876) 971-6220" },
  { name: "Mandeville (Manchester)", code: "MANDVILLE", region: "Manchester", phone: "(876) 625-0600" },
] as const;

export const config = {
  port: Number(process.env.PORT ?? 8080),
  publicWssUrl: process.env.PUBLIC_WSS_URL ?? "wss://localhost/ws/voice",
  agentName: process.env.AGENT_NAME ?? "Max",

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  },

  voice: {
    elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID ?? "yuS5yvxd9cdXv5KzBa74", // "Max" sales voice
    asrProvider: process.env.ASR_PROVIDER ?? "deepgram",
    asrSpeechModel: process.env.ASR_SPEECH_MODEL ?? "nova-2-phonecall",
    ttsProvider: process.env.TTS_PROVIDER ?? "elevenlabs",
    language: process.env.AGENT_LANGUAGE ?? "en-US",
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
  },

  leadsDb: {
    url: process.env.LEADS_SUPABASE_URL ?? "",
    serviceKey: process.env.LEADS_SUPABASE_SERVICE_KEY ?? "",
    schema: "sales",
  },

  inventoryDb: {
    url: process.env.INVENTORY_SUPABASE_URL ?? "",
    key: process.env.INVENTORY_SUPABASE_KEY ?? "",
  },

  recordCalls: (process.env.RECORD_CALLS ?? "false").toLowerCase() === "true",
  forceAgentActive: (process.env.FORCE_AGENT_ACTIVE ?? "false").toLowerCase() === "true", // testing: answer at any hour
  makeNotifyWebhook: process.env.MAKE_NOTIFY_WEBHOOK ?? "",
  timezone: "America/Jamaica",
} as const;

/**
 * ⚠️ PLACEHOLDER — confirm with Omaro (open brief item §13.5).
 * The agent answers calls 24/7; these hours ONLY decide callback timing and the
 * `source` tag (after-hours/Saturday vs normal). Not yet the real TB hours.
 */
export const REP_HOURS = {
  // 0=Sun .. 6=Sat. [openHour, closeHour) in 24h local (America/Jamaica). null = closed.
  0: null,           // Sunday — closed
  1: [8, 17] as const,
  2: [8, 17] as const,
  3: [8, 17] as const,
  4: [8, 17] as const,
  5: [8, 17] as const,
  6: null,           // Saturday — PLACEHOLDER: reps off (the gap this agent fills). Confirm Sat hours.
} as Record<number, readonly [number, number] | null>;


/**
 * Store opening hours (from Google Business, Montego Bay panel; treated as standard
 * across branches — confirm). Close is 5pm; Sunday closed. OPEN HOUR is fuzzy in the
 * screenshot — defaulting to 6am; ⚠️ CONFIRM 6 vs 8 (override via STORE_OPEN_HOUR).
 */
export const STORE_OPEN_HOUR = Number(process.env.STORE_OPEN_HOUR ?? 6);
export const STORE_CLOSE_HOUR = 17; // 5pm
export const AGENT_PADDING_HOURS = Number(process.env.AGENT_PADDING_HOURS ?? 1);

// 0=Sun .. 6=Sat. null = store closed that day. [openHour, closeHour) local (America/Jamaica).
export const STORE_HOURS: Record<number, readonly [number, number] | null> = {
  0: null,                                            // Sunday — closed
  1: [STORE_OPEN_HOUR, STORE_CLOSE_HOUR],
  2: [STORE_OPEN_HOUR, STORE_CLOSE_HOUR],
  3: [STORE_OPEN_HOUR, STORE_CLOSE_HOUR],
  4: [STORE_OPEN_HOUR, STORE_CLOSE_HOUR],
  5: [STORE_OPEN_HOUR, STORE_CLOSE_HOUR],
  6: [STORE_OPEN_HOUR, STORE_CLOSE_HOUR],             // Saturday — OPEN per Google
};
