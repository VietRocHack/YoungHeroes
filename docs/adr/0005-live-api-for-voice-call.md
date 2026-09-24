# 0005 — Migrate the practice call from cascaded STT→LLM→TTS to Gemini Live API

## Status

Accepted and implemented (2026-09-24) — see `docs/progress/20260924.md` for
what shipped and what's still unverified (the migration plan's step 7 manual
QA pass needs a real device with a working microphone, which wasn't
available while building this; see the caveat at the end of this doc).

## Context

The current voice-call flow (`backend/src/main.py`, `services/dispatcher.py`,
`services/voice.py`, `frontend/src/pages/PracticeCall.jsx`) is a cascaded,
turn-based pipeline:

1. Frontend records the child's speech with `MediaRecorder` until they tap
   "Stop Recording", producing a `webm`/`opus` blob.
2. `POST /api/stt` sends the whole blob to Gemini as a `generate_content` call
   with an audio `Part` + a "transcribe this" text prompt, and gets back a
   plain-text transcript.
3. `GET /api/tts` (misleadingly named — it also runs the dispatcher) replays
   the call's Firestore-stored history, appends the transcript, and calls
   Gemini once more with a JSON response schema (`DispatcherTurn`: `message`,
   `isFinished`, `isPrankCall`).
4. The dispatcher's `message` text is sent through a *third* Gemini call
   (`voice.synthesize_speech`) to get back PCM audio, wrapped in a WAV header,
   and returned to the frontend to play.
5. The frontend waits for playback to finish, then starts recording again.

This works, but every turn pays for three sequential model calls and an
explicit "stop talking now" tap — there is no barge-in, no natural pause
detection, and round-trip latency is the sum of STT + dispatcher + TTS. It
reads as a walkie-talkie, not a phone call, which undercuts the pitch (see
`docs/product/pitch.md`) of practicing something that feels like a real 911
call.

Gemini's Live API (`ai.google.dev/gemini-api/docs/live-api`) offers a
different model entirely: a persistent, full-duplex WebSocket session where
the client streams raw microphone audio continuously and the model streams
spoken audio back continuously, with native barge-in support. It collapses
the STT→LLM→TTS cascade into one native audio-to-audio model
(`gemini-3.8-live`, confirmed available on this project's Gemini key — see
`docs/progress/20260924.md`). The already-installed `google-genai==1.3.0` SDK
(`backend/requirements.txt`) already exposes this via `client.aio.live`, so
no new backend dependency is needed.

This directly conflicts with an assumption behind
[0004](0004-call-state-in-firestore.md): that assumption exists because Cloud
Run instances aren't guaranteed to be the same process across two requests,
so state can't live in-process. A Live API session is the opposite of
stateless — it's one long-lived connection for the whole call. This ADR
doesn't invalidate 0004 (Firestore is still useful for the post-call summary
data `PracticeCallResult.jsx` reads from `sessionStorage`/`localStorage`
today, and for the prank-call detection), but it does mean the *live audio
connection itself* has to be pinned to one process for its duration, which
Firestore-per-request wasn't designed to solve.

## Decision

Migrate `PracticeCall.jsx`'s voice loop to the Live API, using the
**server-to-server** architecture: the browser opens a WebSocket to our own
Cloud Run backend (not directly to Gemini), and the backend holds the actual
Live API session, relaying audio frames both directions. This is slower by
one hop than a direct client-to-server connection, but:

- Keeps the Gemini API key server-side only — no ephemeral-token minting
  endpoint to build and secure.
- Cloud Run supports WebSockets and streaming HTTP natively (up to 60 minute
  request timeouts), so this doesn't need new infra, just a new endpoint
  shape.
- Keeps a natural place to still write the post-call summary to Firestore
  when the session ends, without exposing that write path to the client.

The dispatcher's `isFinished`/`isPrankCall` signals — currently just fields
in a JSON schema response — become a **function/tool call** the model
invokes explicitly (the Live API's "asynchronous function calling" per
Google's Sept 2026 announcement), since native audio responses don't carry a
structured side-channel the way a text `generate_content` call does. The
backend declares an `end_call(is_prank_call: bool)` tool; when the model
calls it, the backend closes the session and hands the frontend the result.

## Consequences

- `/api/stt`, and the transcription/synthesis responsibilities of
  `services/voice.py`, go away entirely — `services/dispatcher.py` becomes a
  thin wrapper around one persistent Live session instead of one
  `generate_content` call per turn.
- The frontend's audio capture changes from "record a blob, upload it" to
  "stream raw PCM continuously over a WebSocket," which means replacing
  `MediaRecorder` with the Web Audio API (`AudioWorklet` or
  `ScriptProcessorNode`) to get raw 16-bit PCM at 16kHz — `MediaRecorder`
  only produces compressed container formats (webm/opus), not raw PCM.
- `PracticeCall.jsx`'s state machine (`START`/`DISPATCHER`/`USER`/`END`/
  `ERROR`) collapses: there's no more explicit "your turn"/"their turn"
  button-driven handoff, just a connection that's either open or closed, with
  the model deciding when to speak based on barge-in/silence detection.
- New failure modes to handle that don't exist in a request/response model:
  WebSocket drops mid-call, reconnect/resume semantics, and what happens to
  an in-progress Firestore write if the connection dies uncleanly.
- Cloud Run cost model shifts from "N short requests" to "one held-open
  connection per active call" — worth a budget-alert sanity check
  (`docs/runbook.md` already has one at $10/mo) once this is live, since a
  stuck/leaked connection now costs money for as long as it's open, not just
  for one request.
- This is a bigger rewrite than it looks from the frontend side — see the
  migration plan below before starting.

## Migration plan

Rough order, each step independently testable before moving to the next:

1. **Done.** Backend proof-of-concept (`backend/scripts/live_poc.py`):
   connects `client.aio.live.connect(model="gemini-3.8-live", ...)`, sends
   text turns, confirmed streamed audio comes back correctly.
2. **Done.** `end_call` tool + adapted `SYSTEM_INSTRUCTION` live in
   `backend/src/services/live_call.py`. Verified via `live_poc.py` that the
   model calls `end_call` with the right `is_prank_call` value.
3. **Done.** `WS /api/call/{call_id}/live` in `backend/src/main.py`, relay
   logic in `live_call.run_live_call`. Verified end-to-end (no real
   microphone, but the full connect → stream → tool-call → Firestore write →
   close path) via `backend/scripts/live_ws_test.py`.
4. **Done.** `frontend/src/lib/liveAudio.js` — `ScriptProcessorNode`-based
   mic capture downsampled to 16-bit PCM/16kHz, and a gapless PCM player for
   the 24kHz output that also handles barge-in (`clear()` stops
   already-scheduled audio immediately, not just future chunks — an actual
   bug caught by testing the error path, not by inspection).
5. **Done.** `PracticeCall.jsx` rewritten: connects on mount, no more
   `START`/`DISPATCHER`/`USER`/`END` button state machine, just
   `connecting`/`active`/`ended`/`error`.
6. **Done, conservatively.** Any WebSocket close (mic permission denied,
   unexpected drop, or the clean `end_call` path) routes through one
   `finishCall`/`handleEndCall` path with a guard against double-navigation;
   an unexpected drop reports `naturalEnd: false`, same as today's manual
   hangup.
7. **Not done — real device QA is still needed.** Everything above was
   verified with real Gemini API calls but *no real microphone*: the
   sandboxed environment this was built in blocks mic access outright. What
   this means concretely hasn't been verified against a real voice:
   - Whether `ScriptProcessorNode`'s downsampling quality is good enough for
     Gemini to transcribe reliably (linear interpolation is crude).
   - Real barge-in behavior/latency feel.
   - Mobile browser mic-permission and audio-autoplay behavior specifically
     (called out in the original plan as stricter/more inconsistent than
     desktop).
   - Whether the dispatcher actually waits for real conversation instead of
     wrapping up early — a smoke test with zero user input saw the model call
     `end_call` almost immediately after its own greeting, before asking
     anything. That may just be reasonable behavior for total silence, but it
     needs a real conversation to know for sure whether the prompt needs
     tuning.
   **Test this for real before calling the feature done.**
8. **Done.** `docs/adr/0002-gemini-for-voice-and-quiz.md` marked superseded
   for the dispatcher/TTS/STT portion; `services/dispatcher.py`,
   `services/voice.py`, `models/schemas.py`, `/api/tts`, `/api/stt`, and
   `/api/get_call_states` all deleted; `DISPATCHER_MODEL`/`TTS_MODEL`/
   `TTS_VOICE` removed from `backend/src/config.py`.
