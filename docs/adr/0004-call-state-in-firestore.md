# 0004 — Voice-call conversation state lives in Firestore, not in-process

## Status

Accepted

## Context

The old OpenAI-based backend used the Assistants API's server-side "thread"
as the source of truth for a call's conversation history — the app itself
was stateless and just referenced a `thread_id`. Gemini has no equivalent
stateful primitive: each `generate_content` call is independent and needs the
full conversation history passed in explicitly.

Cloud Run instances are also not guaranteed to be the same process across two
requests for the same call (they can scale to zero, scale out, or recycle),
so in-memory state on the backend process isn't viable even as a stopgap.

## Decision

Store each call's turn-by-turn history in a Firestore document, keyed by the
`callId` the frontend already threads through `new_call` → `tts` →
`get_call_states` (database `youngheroes`, collection `calls` — see
`backend/src/store/call_store.py`). Each `/api/tts` request loads the
document, replays history into the Gemini call, appends the new turn, and
writes it back. `/api/get_call_states` just reads the stored `isFinished`/
`isPrankCall` flags — no extra Gemini call needed.

## Consequences

- Any Cloud Run instance can serve any request for a given call — no sticky
  sessions or in-memory state required.
- One Firestore read + one write per dispatcher turn — negligible cost at
  this app's scale, and free-tier eligible.
- The Cloud Run service account needs `roles/datastore.user` on the
  `youngheroes` Firestore database (see `docs/runbook.md`).
