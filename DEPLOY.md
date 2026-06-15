# DEPLOY.md — Go live & make the first test call

Goal: a real call to a Twilio number where **Max** answers, qualifies the caller, and drops a lead into Supabase. You can test from any phone. (The 499-0815 cutover is separate — see step 6.)

---

## 0. One-time Twilio console setup
1. **Enable ConversationRelay:** Console → Voice → Settings → General → turn on the **Predictive & Generative AI/ML Features** addendum.
2. **Enable ElevenLabs** as a TTS provider on the account (without this, calls fail with **error 64101**).
3. Have a **voice-capable Twilio number** for testing. Any Twilio number works — you don't need 499-0815 yet.

> Trial account note: inbound calls to a trial number play a short "trial account" banner before connecting. That's fine for testing; upgrade later to remove it.

## 1. Deploy the service (Render — has wss/TLS out of the box)
1. Render dashboard → **New** → **Blueprint** → connect **github.com/TropicalBattery/tropical-battery-sales-agent**.
2. It reads `render.yaml` (build `npm install && npm run build`, start `node dist/server.js`, health `/health`).
3. Set the secret env vars (step 2), then **Deploy**.
4. Copy the service URL: `https://<name>.onrender.com`.

*(Fly.io / Railway / any TLS host work too — use `infra/Dockerfile`.)*

## 2. Environment variables
**Pre-filled in `render.yaml` (no action):** `ELEVENLABS_VOICE_ID`, `ANTHROPIC_MODEL`, `LEADS_SUPABASE_URL`, `INVENTORY_SUPABASE_URL`, `FORCE_AGENT_ACTIVE=true`.

**Set as secrets in the dashboard:**
| Var | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic console |
| `TWILIO_ACCOUNT_SID` | Twilio console (the `AC…` id) |
| `TWILIO_AUTH_TOKEN` | Twilio console (the **rotated** token) |
| `LEADS_SUPABASE_SERVICE_KEY` | Supabase → **Sales Call Agent** project → Settings → API → `service_role` key |
| `INVENTORY_SUPABASE_KEY` | Supabase → **Inventory Management** project → Settings → API → `service_role` (read is enough) |

**Set after first deploy (needs the URL):**
- `PUBLIC_WSS_URL = wss://<your-host>/ws/voice` — then redeploy.

> `FORCE_AGENT_ACTIVE=true` makes Max answer at **any hour** for testing. Set it to `false` for production to restore the store-hours window.

## 3. Point Twilio at the service
Twilio Console → **Phone Numbers** → your test number → **Voice Configuration** → "A call comes in" → **Webhook** → `https://<your-host>/voice` → **HTTP POST** → **Save**.

## 4. Smoke check
```bash
curl https://<your-host>/health      # -> {"ok":true,"agent":"Max"}
```

## 5. Make the test call
Call the Twilio number from your phone. Expected:
- Max greets you (ElevenLabs voice), discloses it's an AI.
- Say e.g. *"My car battery is dead, I'm in Montego Bay."*
- Max qualifies (vehicle, urgency, branch, callback) and confirms a callback.
- **Verify the lead:** Supabase → Sales Call Agent → `sales.leads` (or `sales.view_leads`).

## 6. After testing
- Set `FORCE_AGENT_ACTIVE=false` to restore the store-hours window.
- Confirm the **6am vs 8am** open time (`STORE_OPEN_HOUR`).
- Plan **499-0815**: forward it to the Twilio number (fastest) or port it in.

---

## Troubleshooting
| Symptom | Likely cause |
|---|---|
| Call fails / 64101 | ElevenLabs not enabled on the Twilio account |
| You hear "we're closed" | `FORCE_AGENT_ACTIVE` not `true` (or outside the window) |
| Greeting plays, then silence | `PUBLIC_WSS_URL` wrong, or webhook isn't `/voice` POST |
| Conversation works but no lead saved | `LEADS_SUPABASE_SERVICE_KEY` missing/incorrect |
| "do you have X" never checks stock | `INVENTORY_SUPABASE_KEY` missing |
