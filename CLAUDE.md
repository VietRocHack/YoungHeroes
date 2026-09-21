# CLAUDE.md

Young Heroes — an emergency-preparedness training app for kids aged 4-12, built
during a VietRocHack hackathon (see `docs/product/pitch.md`). Kids practice a
simulated 911 voice call with an AI dispatcher, and play two skill-building
mini-games (a branching "recognize the danger" scenario and a "communicate
your emergency" picker), both backed by AI-generated illustrations.

## Repo map

- `frontend/` — React 19 + Vite SPA (`react-router-dom` for routing), built to
  static files (`vite build` → `frontend/dist`) and served by Firebase
  Hosting. Talks to the backend via a relative `/api/...` path, routed
  through Hosting — see `docs/adr/0001-deploy-topology.md`. Quiz images live
  in `frontend/public/assets/generated/`.
- `backend/` — FastAPI app on Cloud Run (`youngheroes-server`). All AI calls
  go through Gemini (`backend/src/services/gemini_client.py`) — see
  `docs/adr/0002-gemini-for-voice-and-quiz.md`. Call/conversation state lives
  in Firestore (database `youngheroes`), not in the process — see
  `docs/adr/0004-call-state-in-firestore.md`, because Cloud Run instances are
  not guaranteed to stay warm or pinned per caller.
- `backend/scripts/generate_quiz_assets.py` — one-time Gemini image-generation
  script that fills `frontend/public/assets/generated/`. Not run per-request
  — see `docs/adr/0003-quiz-images-pregenerated.md`. Re-run it only if the
  prompts in `backend/src/services/quiz.py` change.
- `scripts/deploy.sh` — manual deploy (backend Cloud Run + frontend Hosting).
- `.github/workflows/deploy.yml` — same deploy, automated on push to `main`.
- `docs/` — see `docs/README.md`.

## Before changing anything architectural

Read `docs/adr/` first. Each file is one decision with its reasoning. If
you're about to make a different choice than what's recorded there, add a new
ADR (or mark the old one superseded) — don't silently deviate.

For business/product context (why this exists, who it's for), read
`docs/product/pitch.md`.

## Progress logging — one file per day, not per session

`docs/progress/YYYYMMDD.md` — **one file per calendar day**, not one per
session or per chunk of work. At the end of a work session (or a meaningfully
complete chunk), append a `## HH:MM — title` section to **today's** file
summarizing what changed, decisions made, and open TODOs.

At the **start** of a session, read the most recent file in `docs/progress/`
(sorted by filename) to see where things left off.

## Running things

```bash
# Backend, local dev (needs a GEMINI_API_KEY in backend/.env)
cd backend
python -m venv env && env/Scripts/activate   # or `source env/bin/activate`
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8080

# Frontend, local dev (proxies /api/** to the backend above — see vite.config.js)
cd frontend
npm install
npm run dev                 # http://localhost:3000

# Deploy (both steps, manual)
bash scripts/deploy.sh

# Deploy (automatic, on push to main)
# — handled by .github/workflows/deploy.yml, no local action needed
```

Requires `gcloud` authenticated with deploy permissions on `vietrochack-lab`
and `firebase login` for manual deploys — see `docs/runbook.md` for the
one-time project setup this assumes.

## No test suite (yet)

There's no automated test suite. `backend/tests/test_http.py` is a manual
smoke script, not wired into CI. Verify changes by running both halves
locally and driving the actual voice-call and quiz flows (see
`docs/runbook.md`'s verification steps), or after a deploy by loading the
live URL. If you add real tests, wire them into
`.github/workflows/deploy.yml` rather than leaving them to be run by hand.
