import express from "express";
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { config } from "./config.js";
import { log } from "./logger.js";
import { buildVoiceTwiml, buildVoicemailThanksTwiml } from "./twiml.js";
import { handlePrompt } from "./conversation.js";
import { AnthropicLlm } from "./llm.js";
import { insertCallLog, insertVoicemailLead, updateLeadTranscription } from "./leadsStore.js";
import type { CallSession, RelayInbound, RelayOutbound } from "./types.js";

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, agent: config.agentName }));

// Twilio hits this when a call comes in; we return TwiML that opens the WS.
app.post("/voice", (_req, res) => {
  res.type("text/xml").send(buildVoiceTwiml());
});

// After-hours voicemail recorded -> create a lead from caller number + recording.
app.post("/voicemail", async (req, res) => {
  const { From, RecordingUrl, CallSid } = req.body ?? {};
  try { await insertVoicemailLead({ phone: From, recordingUrl: RecordingUrl, callSid: CallSid }); }
  catch (e) { log.error("voicemail lead failed", String(e)); }
  res.type("text/xml").send(buildVoicemailThanksTwiml());
});

// Twilio posts the voicemail transcription asynchronously -> enrich the lead.
app.post("/voicemail-transcription", async (req, res) => {
  const { TranscriptionText, CallSid } = req.body ?? {};
  try { await updateLeadTranscription(CallSid, TranscriptionText ?? ""); }
  catch (e) { log.error("voicemail transcription update failed", String(e)); }
  res.sendStatus(204);
});


const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/voice" });
const llm = new AnthropicLlm();

wss.on("connection", (ws: WebSocket) => {
  const session: CallSession = {
    callSid: "unknown", from: "unknown", startedAt: Date.now(),
    history: [], lead: {}, captured: false, interrupted: false,
  };
  const send = (msg: RelayOutbound) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg));

  ws.on("message", async (raw) => {
    let event: RelayInbound;
    try { event = JSON.parse(raw.toString()); }
    catch { log.warn("bad ws frame"); return; }

    switch (event.type) {
      case "setup":
      case "connected":
        session.callSid = (event as any).callSid ?? session.callSid;
        session.from = (event as any).from ?? (event as any).customParameters?.from ?? session.from;
        log.info("call connected", { callSid: session.callSid, from: session.from });
        break;
      case "prompt":
        try { await handlePrompt(session, event.voicePrompt, send, llm); }
        catch (e) { log.error("handlePrompt failed", String(e)); send({ type: "text", token: "Sorry, I had a hiccup — could you repeat that?", last: true }); }
        break;
      case "interrupt":
        session.interrupted = true;
        break;
      case "dtmf":
        log.info("dtmf", { digit: event.digit });
        break;
      case "error":
        log.error("relay error", event.description);
        break;
    }
  });

  ws.on("close", async () => {
    log.info("call ended", { callSid: session.callSid, captured: session.captured });
    await insertCallLog(session, session.captured ? "completed-captured" : "completed-no-capture");
  });
});

server.listen(config.port, () => {
  log.info(`sales agent listening on :${config.port}`, {
    voice: `${config.voice.ttsProvider}/${config.voice.asrProvider}`,
    leadsDb: config.leadsDb.url ? "configured" : "MISSING",
    inventoryDb: config.inventoryDb.url ? "configured" : "MISSING",
    anthropic: config.anthropic.apiKey ? "configured" : "MISSING",
  });
});

export { app, server };
