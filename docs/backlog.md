# Backlog

Known non-blocking issues and cleanup, checked off as they land.

- [ ] No automated test suite — `backend/tests/test_http.py` is a manual smoke
      script only. Add real tests (pytest for the backend, a frontend
      component/e2e suite) and wire them into `.github/workflows/deploy.yml`.
- [ ] The `skills/communicate` flow has no "correct answer" concept by design
      (it's a self-report flow) — its result screen recaps the child's actual
      answers rather than scoring them. If a future design wants this scored
      too, that needs new content (a canonical "right" answer per scenario),
      not just a code change.
- [ ] `backend/scripts/generate_quiz_assets.py` images are reviewed once at
      generation time, not automatically validated — if Gemini's image model
      output drifts in style on a re-run, review the diffed PNGs before
      committing.
- [ ] The dispatcher's `SYSTEM_INSTRUCTION` (`backend/src/services/dispatcher.py`)
      was authored fresh for this migration (the original OpenAI Assistant's
      configured instructions were never in either repo). Worth a deliberate
      prompt-review/red-team pass given the child audience, beyond what
      shipped in this migration.
- [ ] Multi-language support was called out as a future goal in the original
      pitch (`docs/product/pitch.md`) — not in scope for this migration.
