# 0002 — Gemini replaces OpenAI for the dispatcher, TTS/STT, and quiz images

## Status

Accepted

## Context

The original hackathon build used OpenAI for everything: the Assistants API
(threads/runs) as the "911 dispatcher" brain, OpenAI TTS for the dispatcher's
voice, and Whisper for speech-to-text. There was no image generation feature
at all — the two quiz mini-games used pre-made stock photos and had no
scoring, despite the original Devpost pitch describing "AI-generated
realistic scenarios complete with multimedia elements like voice, text, and
pictures."

Continuing an OpenAI paid API dependency isn't sustainable for a permanent,
team-owned deploy with no per-project hackathon budget.

## Decision

Move every AI call to Gemini:

- **Dispatcher**: `gemini-flash-latest` with a JSON response schema
  (`{message, isFinished, isPrankCall}`) — see
  `backend/src/services/dispatcher.py`. OpenAI's Assistants API has no
  equivalent stateful "thread" primitive, so conversation history moves to
  Firestore — see `0004-call-state-in-firestore.md`. The dispatcher persona
  itself (system instructions/safety rules) previously lived only in OpenAI's
  dashboard config, not in either repo, so it's been rewritten from scratch
  in `dispatcher.py`'s `SYSTEM_INSTRUCTION`.
- **TTS**: `gemini-3.1-flash-tts-preview`, which returns raw 16-bit PCM audio
  that `backend/src/services/voice.py` wraps into a WAV container before
  streaming back (the frontend expects a playable audio file, same as the
  old OpenAI TTS response).
- **STT**: sending the recorded audio directly to Gemini as a multimodal
  `generate_content` call with a "transcribe exactly" prompt, instead of a
  separate Whisper call.
- **Quiz images**: `gemini-3.1-flash-image`, generated once offline — see
  `0003-quiz-images-pregenerated.md`.

## Consequences

- One provider, one API key (`GEMINI_API_KEY`, Secret Manager), one bill.
- No more stateful "Assistant" configured out-of-band in a vendor dashboard —
  the whole dispatcher behavior is in `dispatcher.py`, reviewable and
  versioned like any other code.
- The JSON contract (`message`/`isFinished`/`isPrankCall`) is preserved so the
  frontend's `practice/call/page.jsx` needed no logic changes beyond removing
  the local-Flask-fallback base URL.
