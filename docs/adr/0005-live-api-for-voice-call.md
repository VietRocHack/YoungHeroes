# 0005 — Migrate the practice call from cascaded STT→LLM→TTS to Gemini Live API

## Status

Proposed

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

1. **Backend: proof-of-concept Live session, no frontend changes yet.**
   Write a throwaway script (like `backend/scripts/generate_quiz_assets.py`)
   that opens `client.aio.live.connect(model="gemini-3.8-live", config=...)`,
   streams a prerecorded 16kHz PCM WAV file's bytes in, and saves whatever
   audio comes back. Confirms the model, auth, and audio format assumptions
   before touching production code.
2. **Backend: declare the `end_call` tool and port `SYSTEM_INSTRUCTION`.**
   Adapt the existing dispatcher prompt (`services/dispatcher.py`) for a
   continuous conversation instead of one-shot turns, and confirm the model
   actually calls `end_call` with the right `is_prank_call` value in a few
   manual test conversations via the step-1 script.
3. **Backend: new WebSocket endpoint** (e.g. `WS /api/call/{callId}`) that,
   on connect, opens the corresponding Live session, pipes inbound binary
   WebSocket frames to it as audio, and pipes the model's outbound audio back
   as binary frames. Keep writing the final summary to Firestore
   (`call_store`) when `end_call` fires or the socket closes, so
   `PracticeCallResult.jsx` keeps working unchanged.
4. **Frontend: replace `MediaRecorder` capture with raw PCM streaming.** Use
   `AudioContext` + `AudioWorkletNode` to capture mic input, downsample/
   resample to 16kHz 16-bit PCM (the browser's mic is rarely natively 16kHz),
   and send frames over the WebSocket from step 3. Play back the model's
   24kHz PCM via `AudioContext` as it arrives, rather than waiting for a full
   WAV blob.
5. **Frontend: collapse the state machine.** Replace the
   `START`/`DISPATCHER`/`USER`/`END` button-driven flow with: connect on
   mount, stream continuously, show a simple "listening"/"speaking"
   indicator driven by whatever activity signal the Live API exposes, and
   handle the `end_call` result the same way `handleEndCall` does today.
6. **Handle reconnection/errors.** Decide what happens on an unexpected
   WebSocket close mid-call — likely: treat it the same as `handleEndCall`
   with `naturalEnd: false`, matching today's non-natural-end behavior, since
   silently retrying a live audio session mid-conversation is its own can of
   worms.
7. **Manual QA pass**: full call end-to-end on both desktop and mobile
   (mobile browsers' audio autoplay/mic permission behavior is stricter and
   more inconsistent than desktop — verify before considering this done),
   plus the prank-call path specifically, since that's the one behavior
   change most likely to regress silently if the tool-calling migration in
   step 2 doesn't work exactly like the old JSON-schema field did.
8. **Update `docs/adr/0002-gemini-for-voice-and-quiz.md`** to point at
   `gemini-3.8-live` instead of the separate dispatcher/TTS models for the
   call flow (the quiz's image generation model is unaffected), and remove
   `TTS_MODEL`/`TTS_VOICE` from `backend/src/config.py` once
   `services/voice.py` is deleted.
