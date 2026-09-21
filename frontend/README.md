# Young Heroes — frontend

React 19 + Vite SPA (`react-router-dom` for routing), built to static files
and served by Firebase Hosting. See the repo root [`CLAUDE.md`](../CLAUDE.md)
and [`docs/runbook.md`](../docs/runbook.md) for local dev and deploy — this
app no longer has its own backend; it talks to [`../backend`](../backend)
over a relative `/api/...` path.

```bash
npm install
npm run dev   # http://localhost:3000, proxies /api/** to a local backend on :8080
```
