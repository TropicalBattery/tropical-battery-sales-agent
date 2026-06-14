import twilio from "twilio";
import { config } from "./config.js";

/**
 * TwiML for the inbound voice webhook. Twilio handles ASR + TTS; we only bring the
 * brain over the WebSocket. If RECORD_CALLS=true, a consent line is spoken and
 * <Start><Recording> is emitted BEFORE <Connect> (REST record:true is ignored by CR).
 */
export function buildVoiceTwiml(): string {
  const { VoiceResponse } = twilio.twiml;
  const vr = new VoiceResponse();

  const consent = config.recordCalls
    ? " This call may be recorded for quality and training."
    : "";
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
  // Pass the caller's number through to the WS as a custom parameter.
  (cr as unknown as { parameter: (a: Record<string, string>) => void }).parameter({ name: "from", value: "{{From}}" });

  return vr.toString();
}
