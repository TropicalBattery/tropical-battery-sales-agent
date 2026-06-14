# Architecture — Tropical Battery Inbound Sales Agent

## One-line
A real-time inbound phone agent: **Twilio ConversationRelay** does telephony + ASR/TTS, a **Node/TypeScript WebSocket service** brings the **Claude** brain, **leads land in Supabase** and **Make** handles async notifications.

## Why ConversationRelay (not Make)
A live call is full-duplex, sub-second, turn-taking — Make can't carry real-time call audio. ConversationRelay solves the hard transport: Twilio runs Deepgram ASR and ElevenLabs TTS, and our app only exchanges **text** over a `wss://` WebSocket. (Jenny's WhatsApp flow stays on Make because a voice note is an async *file*.)

## Components
| Piece | Tech | Role |
|---|---|---|
| Voice webhook | Express `POST /voice` | Returns TwiML `<Connect><ConversationRelay>` |
| Realtime brain | `ws` WebSocket `/ws/voice` | Handles `prompt`/`interrupt`/`dtmf`, streams text |
| LLM | Claude (`@anthropic-ai/sdk`, streaming) | Conversation + tool calls |
| Tools | `answer_faq`, `check_product_availability`, `capture_lead`, `book_callback` | Structured actions |
| Leads store | Supabase `sales` schema | `leads`, `call_logs`, `view_leads` (Power BI) |
| Inventory | Supabase read-only view | `view_branch_availability` (soft stock) |
| Async | Make (existing workspace) | Notifications + Monday digest |

## Flow
See `sequence-diagram.mmd`. In short: call → TwiML → WS opens → each caller turn streams Claude tokens to TTS; tool calls run server-side (inventory read, lead write) and feed results back; `last:true` ends each spoken reply; on hangup a call_log is written.

## Key correctness points (from the ConversationRelay skill)
- Twilio won't speak until it sees a `last:true` token — we always send a terminal `{token:"", last:true}`.
- `voicePrompt` is **untrusted** caller speech — it only ever enters Claude as a user turn, never as instructions.
- ElevenLabs must be enabled on the Twilio account (else error 64101); **voice IDs**, not names, are required.
- Recording (if used) must be `<Start><Recording>` in TwiML — REST `record:true` is ignored. Off by default.
- No built-in memory — per-call history is held in the session and persisted as `call_logs`.

## Data layer — verified live (2026-06-14)
- **Inventory** (`qunnxsxeevoeflqfrzwz`): `view_branch_availability` returns in-stock SKUs per retail branch (Ferry 407, Ashenheim 384, Mandeville 373, MoBay 365, Grove 327, Ocho Rios 249). Products are deduped (each SKU appears ~2×) and limited to the six retail `location_code`s.
- **Leads** (`jnopqxeqziazaqknuvmy`, `sales` schema): insert→view→delete round-trip verified; `view_leads` exposes Jamaica-local date/day-of-week for Power BI. RLS on; backend uses the service-role key.

## Deploy
Any host that terminates TLS and gives a `wss://` URL: Render (`infra/render.yaml`), Fly.io, Railway, or a TLS VPS (`infra/Dockerfile`). Set `PUBLIC_WSS_URL` to the deployed `wss://…/ws/voice` and point the Twilio number's Voice webhook at `POST /voice`.

## Cost surfaces to watch
Claude tokens + Twilio per-minute voice + (ElevenLabs/Deepgram via Twilio). Build a per-call estimate before the pilot.
