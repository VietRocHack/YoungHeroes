# 0003 — Quiz images are generated once offline, not live per request

## Status

Accepted

## Context

The two quiz mini-games (`skills/recognize`'s branching fire scenario,
`skills/communicate`'s 4-question picker) have a fixed, small set of images:
7 scenario images and 16 question-option icons. The original hackathon build
used pre-made stock photos for these; the user asked for these to be
"actually generated" (matching the original Devpost pitch of AI-generated
scenario imagery), and confirmed the fix should upgrade the two existing
mini-games in place rather than build a new page.

## Decision

Generate all 23 images once with `backend/scripts/generate_quiz_assets.py`
(Gemini's `gemini-3.1-flash-image` model, one consistent kid-friendly
illustration-style prompt prefix — see `backend/src/services/quiz.py`), and
commit the resulting PNGs into `frontend/public/assets/generated/`, exactly
like the stock images they replace. There is no live `/api/quiz/...`
generation endpoint.

Rationale:

- The scenario content is fixed (a hand-authored branching tree / question
  set), not personalized per user, so there's nothing to gain from
  regenerating it per session.
- The audience is young children — waiting on live image-gen latency
  mid-quiz, or a flaky/failed generation, is a much worse experience than a
  pre-baked, verified-good image.
- No ongoing Gemini image-gen cost on every play, and no new failure mode
  (image API down) taking out the quiz.

## Consequences

- Changing a scenario's image means re-running the script for that one
  filename (or all of them), reviewing the output, and committing it — not
  an automatic side effect of editing scenario text.
- If a genuinely dynamic/personalized image feature is wanted later, it
  should be a new, explicitly-scoped decision (probably superseding this
  ADR), not an assumption that this pipeline can be pointed at request time
  as-is (it isn't wired into any live route).
