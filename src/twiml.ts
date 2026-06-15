import twilio from "twilio";
import { config } from "./config.js";
import { agentActive } from "./hours.js";

/** Spoken when a call lands outside the agent's active window. */
function closedMessage(): string {
  return (
    `Thanks for calling Tropical Battery. We're closed at the moment — our store is open ` +
    `Monday to Saturday, until five o'clock. Please call back during opening hours. ` +
    `For roadside battery help any time, call 1 8 8 8, 7 6 7, 4 2 2 5. Goodbye!`
  );
}

/**
 * Inbound voice webhook TwiML.
 * - Inside the agent window  → <Connect><ConversationRelay> (the AI answers; Twilio does ASR+TTS).
 * - Outside the window       → a short closed message, then hang up.
 * If RECORD_CALLS=true, a consent line is spoken and <Start><Recording> is emitted BEFORE <Connect>.
 */
export function buildVoiceTwiml(now: Date = new Date()): string {
  const { VoiceResponse } = twilio.twiml;
  const vr = new VoiceResponse();

  if (!agentActive(now)) {
    vr.say(closedMessage());
    vr.hangup();
    return vr.toString();
  }

  const consent = config.recordCalls ? " This call may be recorded for quality and training." : "";
  const greeting =
    `Hi, you've reached Tropical Battery. I'm ${config.agentName}, the AI assistant — ` +
    `I can help with batteries, solar, tyres and more, and get a rep to follow up.${consent}`;

  if (config.recordCalls) {
    const start = vr.start();
    start.recording({ recordingStatusCallback: "/recording-status" });
  }

  const connect = vr.connect();
  const cr = connect.conversationRelay({
    url: config.publicWssUrl,
    welcomeGreeting: greeting,
    voice: config.voice.elevenLabsVoiceId || undefined,
    ttsProvider: config.voice.ttsProvider,
    transcriptionProvider: config.voice.asrProvider,
    speechModel: config.voice.asrSpeechModel,
    language: config.voice.language,
    interruptByDtmf: true,
  } as Record<string, unknown>);
  (cr as unknown as { parameter: (a: Record<string, string>) => void }).parameter({ name: "from", value: "{{From}}" });

  return vr.toString();
}
