# WURK account watcher (Render free tier)

Emails you when something moves on your WURK account — a contest resolves, a
payout lands, a submission changes status.

It runs as a **Render free-tier web service**. There is no CLI, no database, no
wallet key and no npm dependency: it talks to the WURK account API directly with
an account API key and sends mail through Sendliberty.

```
        ┌──────────────────────────────┐
        │  Render free web service     │
        │  node server.mjs             │
        └───────────┬──────────────────┘
                    │ every 2 h, and on boot
                    ▼
   GET https://wurkapi.fun/wurker/submissions   (X-API-Key)
                    │
            diff vs last known state
                    │
                    ▼
   POST https://sendliberty.com/api/send  ──▶  your inbox
```

## Why a web service and not a cron job?

Render cron jobs are **not** on the free tier (they carry a ~$1/month minimum)
and cannot attach a persistent disk. A free-tier *web service* can, so this runs
as one and does two things to behave like a scheduler:

1. **Checks on a timer** (`CHECK_INTERVAL_MINUTES`, default 120).
2. **Pings its own public URL** every `KEEPALIVE_MINUTES` (default 10) so Render
   doesn't spin the instance down after 15 minutes of inactivity.

That second point is load-bearing. A free instance that spins down stays down —
nothing is left running to wake it — so the keepalive is what keeps checks
happening at all.

### Free-tier arithmetic

Render gives 750 free instance-hours per month. One always-on service uses about
730, which fits — but the allowance is **per workspace**, so if you later add
other free services the total can be exceeded. If Render suspends the service,
either remove the other free services or upgrade this one to Starter ($7/month).

## Deploy

1. Push this folder to a branch of a repo connected to Render (a branch named
   `wurk-watch` on your existing repo is fine).
2. In Render: **New + → Blueprint**, pick the repo and branch. Render reads
   `render.yaml` and prompts for the two secrets.
3. Fill in:
   - `WURK_API_KEY` — the 40-hex account API key
   - `SENDLIBERTY_KEY` — the `sl_…` key from sendliberty.com
4. Deploy. Then open the service URL and confirm:
   ```json
   { "ok": true, "service": "wurk-watch",
     "configured": { "apiKey": true, "sendliberty": true, "mailTo": true, "keepalive": true } }
   ```
   `keepalive` must be `true` — it only becomes true on Render, where
   `RENDER_EXTERNAL_URL` is provided automatically.

Rather than using the Blueprint, you can create a **Web Service** by hand: plan
Free, build `npm install`, start `node server.mjs`, health check `/`, and add the
environment variables from `render.yaml` manually.

## Configuration

| variable | default | meaning |
|---|---|---|
| `WURK_API_KEY` | — | **required.** 40-hex account API key |
| `SENDLIBERTY_KEY` | — | **required.** `sl_…` key |
| `MAIL_TO` | — | **required.** recipient |
| `MAIL_FROM` | `MAIL_TO` | must be the Gmail connected to Sendliberty |
| `WURK_ORIGIN` | `https://wurkapi.fun` | API origin |
| `CHECK_INTERVAL_MINUTES` | `120` | how often to check |
| `KEEPALIVE_MINUTES` | `10` | self-ping interval; keep below 15 |
| `BASELINE_LOOKBACK_HOURS` | `24` | on a cold start, re-report wins paid within this window |
| `RUN_TOKEN` | — | if set, `GET /check?token=…` is required to force a check |
| `STATE_PATH` | `./state.json` | where the watermark is kept |

## Endpoints

| route | purpose |
|---|---|
| `GET /` | status JSON — safe to expose; contains no account detail |
| `GET /check?token=…` | start a check now, returns `202` immediately |

## What triggers an email

One message per submission that moved, most significant transition only:

- **PAID** — `reward_received_at` was empty and is now set
- **SELECTED — PAYMENT PENDING** — `winner` flipped to true but not yet paid
- **STATUS CHANGE** — `work_status` / `submission_status` changed
- **NEW SUBMISSION** — a submission id not seen before

A check that fails (network, auth, API outage) emails at most once per 6 hours,
so a broken watcher can't fail silently for weeks.

## State, and why there is a lookback window

The watermark lives in `state.json` on the container's disk. Render free
instances are ephemeral, so a restart loses it. Rather than silently re-baseline
(which could swallow the one payout you care about), a cold start **re-reports
any win paid within `BASELINE_LOOKBACK_HOURS`**. The cost is at most one
duplicate email per cold start; the benefit is that a restart can never hide a
payout.

## Rate limits

`GET /wurker/submissions` is rate limited (`AGENT_SUBMISSIONS_RATE_LIMITED`,
HTTP 429) and the response carries **no** `Retry-After`. The watcher treats 429
as "come back later": it retries in-run (30 s, 75 s), never advances the
watermark, and never sends a failure alert for it. At the default two-hour
interval you should not see it at all; hammering the service manually will.

## Running it locally

```bash
export WURK_API_KEY=...          # PowerShell: $env:WURK_API_KEY='...'
export SENDLIBERTY_KEY=sl_...
export MAIL_TO=you@example.com
export MAIL_FROM=you@example.com

node server.mjs --test-email     # prove delivery
node server.mjs --once --dry     # one check, print the diff, send and save nothing
node server.mjs --once           # one check, email on change, save state
node server.mjs                  # serve + schedule (no keepalive without RENDER_EXTERNAL_URL)
```

Locally there is no `RENDER_EXTERNAL_URL`, so the keepalive is skipped — which is
correct, since your machine is already awake.

## Notes

- The WURK API is read with the **account API key only**. The wallet private key
  is not used, not needed, and must not be put in this service's environment.
- This service only ever **reads** from WURK. In particular it deliberately does
  not call `POST /notifications`, which records an inbox visit and marks your
  entire inbox read — your WURK notifications are left untouched.
- The status page at `/` is public. It reports only booleans, counters and
  timestamps, never balances, submission ids or account identifiers.
