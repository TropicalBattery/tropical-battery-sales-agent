import twilio from "twilio";
import { config } from "./config.js";
import { agentActive } from "./hours.js";

/**
 * Inbound voice webhook TwiML.
 * - Inside the agent window  → <Connect><ConversationRelay> (the AI answers).
 * - Outside the window       → closed message + voicemail capture (so the lead isn't lost).
 */
export function buildVoiceTwiml(now: Date = new Date()): string {
  const { VoiceResponse } = twilio.twiml;
  const vr = new VoiceResponse();

  if (!agentActive(now)) {
    vr.say(
      "Thanks for calling Tropical Battery. We're closed at the moment — open Monday to Saturday, until five. " +
      "If you'd like a rep to call you back, please leave your name, number, and what you need after the beep. " +
      "For roadside battery help any time, call 1 8 8 8, 7 6 7, 4 2 2 5.",
    );
    vr.record({
      action: "/voicemail",
      method: "POST",
      maxLength: 120,
      playBeep: true,
      finishOnKey: "#",
      transcribe: true,
      transcribeCallback: "/voicemail-transcription",
    });
    // If they don't record, still close gracefully.
    vr.say("We didn't catch a message. Please call back during opening hours. Goodbye!");
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

/** TwiML returned after a voicemail is recorded (the <Record action> target). */
export function buildVoicemailThanksTwiml(): string {
  const { VoiceResponse } = twilio.twiml;
  const vr = new VoiceResponse();
  vr.say("Thank you! A rep will call you back during opening hours. Goodbye!");
  vr.hangup();
  return vr.toString();
}
