# 0006 — Abuse prevention for the public, Gemini-backed backend

## Status

Accepted and implemented (2026-09-25). App Check is built but **off** until
the reCAPTCHA Enterprise key is registered (`APP_CHECK_ENFORCE=false`,
frontend inert without its `VITE_*` vars) — see `docs/runbook.md`'s "Abuse
prevention" section.

## Context

Every call endpoint spends money on Gemini, and all of them were fully open.
`--allow-unauthenticated` Cloud Run had no instance cap. The Live WebSocket
(ADR 0005) accepted any `call_id`, including ones `/api/new_call` never
issued, checked no `Origin`, had no length or idle limit, and allowed
unlimited reconnects. `/api/tts` and `/api/stt` accepted any `callId` (or
none) and any text or upload size. A single script could hold many Live
sessions open for up to Cloud Run's request timeout.

The users are kids aged 4–12, which rules out the usual answer of a login:
kids can't manage accounts, collecting emails from under-13s triggers COPPA
parental-consent requirements, and free sign-up doesn't slow a scripted
attacker anyway.

## Decision

Layered limits, no user accounts. `/api/new_call` is the one gate; every
paid endpoint requires a call ID it issued.

1. **Hard cost ceilings (outside the code):** AI Studio monthly spend cap,
   Gemini API key restricted to the Generative Language API, and Cloud Run
   `--max-instances=3 --concurrency=20 --timeout=300` in both deploy paths.
2. **Call IDs are single-purpose tickets** (`call_store.is_call_open`,
   `claim_live_session`): honored only if issued within
   `CALL_ID_MAX_AGE_SECONDS` (10 min) and not finished, and a Live session
   can be claimed once per ID (atomic Firestore transaction). The classic
   flow caps turns per call (`CLASSIC_MAX_TURNS`).
3. **Live WebSocket limits** (`live_call.run_live_call`): `Origin` must be in
   `ALLOWED_ORIGINS`, checked before `accept()` (the socket goes straight to
   Cloud Run, not through Hosting, so nothing else enforces this). Calls are
   capped at `LIVE_MAX_CALL_SECONDS` (240s, under Cloud Run's 300s timeout)
   and end after `LIVE_IDLE_SECONDS` (30s) with no audio frames. Oversized
   frames end the call.
4. **Input caps:** `/api/tts` text ≤ 500 chars, `/api/stt` upload ≤ 2MB, and
   `/api/stt` now requires `callId` (a form field).
5. **Rate limits on `/api/new_call`**, stored as hourly counters in Firestore
   (`rateLimits` collection, hashed keys, `expiresAt` for TTL cleanup),
   because in-memory counters don't survive Cloud Run's instance churn (ADR
   0004): 20/hour per client IP (generous, since a classroom shares one IP)
   and 300/hour globally.
6. **Firebase App Check with limited-use tokens** on `/api/new_call`:
   the frontend sends `getLimitedUseToken()` as `X-Firebase-AppCheck`, and
   the backend verifies with `consume=True`, so a token copied out of the
   browser can't be replayed.

## Consequences

- The client IP is best-effort. Through Hosting it comes from
  `Fastly-Client-IP`; direct to Cloud Run it's the last `X-Forwarded-For`
  hop. Anyone calling the Cloud Run URL directly can forge
  `Fastly-Client-IP` and dodge the per-IP limit. The global limit and App
  Check are what hold in that case, and the spend cap backs everything.
- The global limit means a determined attacker can use up the hour's 300
  calls and lock real users out until the next hour. We accept that: a
  denial of service on a free practice app is better than an unbounded bill.
  Raise `NEW_CALLS_GLOBAL_PER_HOUR` if real traffic approaches it.
- The classic flow no longer reuses a call ID from `localStorage` across
  visits; every call fetches a fresh one (an old ID would be stale or finished).
- The Live toggle label dropped "(Beta)" (product call, 2026-09-25). Classic
  stays available as a fallback.
- **Not done:** Firebase Anonymous Auth for per-device limits. Add it only if
  shared-IP classrooms start hitting the per-IP limit. Parent accounts with
  kid profiles are the model to use if this becomes a real product, which
  would need its own ADR.
