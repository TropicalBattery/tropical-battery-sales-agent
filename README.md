# Tropical Battery — Inbound Sales Call Agent

Real-time AI phone agent for Tropical Battery's retail store: answers inbound calls (Saturdays + after-hours), qualifies callers, captures structured leads, and books rep callbacks. **Twilio ConversationRelay** (telephony + Deepgram ASR + ElevenLabs TTS) → **WebSocket service** → **Claude** brain → **Supabase** leads (+ Make notifications).

> Not Jenny (the IT Helpdesk agent on Make). A live call is real-time, so the core is a persistent WebSocket service — see `docs/architecture.md`.

## Status (2026-06-14)
**Built & verified**
- ✅ WebSocket service: TwiML webhook + ConversationRelay handler, token streaming, barge-in, dtmf.
- ✅ Claude streaming + tool loop (`answer_faq`, `check_product_availability`, `capture_lead`, `book_callback`).
- ✅ Lead scoring (retail BANT) + business-hours/callback gating (America/Jamaica).
- ✅ Supabase **leads** in a **dedicated 'Sales Call Agent' project** (`ztgerulyxaltuhsodrne`, us-east-1) — insert→view→delete round-trip tested.
- ✅ Supabase **inventory** read view (`view_branch_availability`) — soft per-branch availability, live data verified.
- ✅ Typecheck clean; 9 unit tests + 6 smoke checks passing; server boots and serves valid TwiML.

**Pending your input (unblocks the rest)**
- ⏳ Persona **name** (recommended: Max) + dedicated **ElevenLabs voice ID**.
- ⏳ **(876) 499-0815** provisioning path (port / forward / already VoIP) — run the AvailablePhoneNumbers check.
- ⏳ Flip the **ConversationRelay** toggle (Console → Voice → Settings → accept the AI/ML addendum) + enable ElevenLabs.
- ⏳ Branch **opening hours** (esp. Saturday) — placeholder in `src/config.ts` (`REP_HOURS`).
- ⏳ Repo home: this repo (`tropical-battery-sales-agent`) vs a monorepo — and a GitHub surface that can create it.
- ⏳ Deploy to a TLS host; set `PUBLIC_WSS_URL`; point the Twilio number's Voice webhook at `/voice`.
- ✅ Dedicated $10/mo Supabase project created (Pro plan) — leads wired to it; temporary IT-Helpdesk schema removed.

## Run locally
```bash
cp .env.example .env   # fill secrets in your host's secret store, not in git
npm install
npm run typecheck
npm test
npm run smoke
npm run dev            # starts on :8080
```

## Deploy
TLS host required (ConversationRelay needs `wss://`). See `infra/render.yaml` (Render) or `infra/Dockerfile`.
Then: set the Twilio number's Voice webhook to `https://<host>/voice`, and `PUBLIC_WSS_URL=wss://<host>/ws/voice`.

## Layout
```
src/            server.ts (HTTP+WS), conversation.ts (tool loop), llm.ts, twiml.ts,
                hours.ts, leadScore.ts, inventory.ts, leadsStore.ts, config.ts
src/tools/      answer_faq, check_product_availability, capture_lead, book_callback
src/prompt/     systemPrompt.ts (runtime persona + guardrails)
supabase/       migrations/ (leads schema + inventory view — already applied live)
infra/          Dockerfile, render.yaml
docs/           architecture.md, sales-agent-playbook.md, knowledge-base.md, sequence-diagram.mmd
test/           vitest suites      scripts/  smoke.ts
```

## Security
Secrets live in the host's secret store + `.env` (git-ignored) — never committed. Prefer a scoped Twilio **API Key** (SID+Secret) over the account Auth Token. `voicePrompt` is treated as untrusted caller input.
