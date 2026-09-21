# 0001 — Deploy topology: static Hosting frontend + Cloud Run backend API

## Status

Accepted

## Context

The app was split across two hackathon repos (`YoungHeroes-frontend` on
Vercel with Python serverless functions, `YoungHeroes-backend` an abandoned
standalone Flask server) and needs to move to `vietrochack-lab` permanently,
live at `youngheroes.vietrochack.com`, per `migration-guide`.

Neither of the guide's two existing patterns fits directly:

- The Cloud-Functions pattern (RocMap) is for a single stateless HTTP
  function — this backend is a real multi-route server with persistent
  Firestore-backed conversation state, which is exactly the case the guide
  says to use Cloud Run for instead.
- The "Cloud Run serves everything including the frontend build" pattern is
  for a backend that *already* bundles and serves its own frontend as one
  process. This backend never did that — the frontend was always a separately
  built/deployed Next.js app.

The frontend is a client-only React app (no SSR/server component needs), so
it's a natural fit for a plain static build rather than a Node server.

## Decision

- Frontend: React 19 + Vite SPA (`react-router-dom` for client-side routing),
  `vite build` output served directly by Firebase Hosting site
  `vietrochack-youngheroes` (target `youngheroes`).
- Backend: FastAPI app on Cloud Run, service `youngheroes-server`,
  `us-central1`.
- One origin: `firebase.json` rewrites `/api/**` to the Cloud Run service and
  everything else to `/index.html`. No CORS, one DNS record
  (`youngheroes.vietrochack.com` → the Hosting site).

## Consequences

- Frontend deploys are fast and free (static files only); backend scales
  independently as a real container.
- Local dev needs its own proxy since there's no Hosting emulator layer in
  `vite dev` — see `vite.config.js`'s `server.proxy` pointing `/api` at
  `http://127.0.0.1:8080`.
- Client-side routing (`react-router-dom`) means a direct load of, say,
  `/skills/recognize` has to fall through to `index.html` and let the router
  take over — that's what `firebase.json`'s catch-all `** -> /index.html`
  rewrite is for.
- This is a third topology pattern beyond the two `migration-guide` already
  documented; it's been added back to that guide for the next app that fits
  this shape (static-buildable frontend + a real persistent backend).
