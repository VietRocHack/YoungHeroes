# Runbook

## One-time GCP/Firebase setup (already done for this app, kept here for reference)

```bash
PROJECT=vietrochack-lab
REGION=us-central1

# APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com firestore.googleapis.com \
  secretmanager.googleapis.com --project=$PROJECT

# Firestore database (named, not the shared default)
gcloud firestore databases create --database=youngheroes --location=$REGION --project=$PROJECT

# Artifact Registry repo for backend container images
gcloud artifacts repositories create youngheroes --repository-format=docker \
  --location=$REGION --project=$PROJECT

# Secret Manager: Gemini API key (get one from Google AI Studio)
printf '%s' "$GEMINI_API_KEY" | gcloud secrets create youngheroes-gemini-api-key \
  --data-file=- --project=$PROJECT

# Firebase Hosting site + target
firebase hosting:sites:create vietrochack-youngheroes --project=$PROJECT
# .firebaserc target mapping is already committed in this repo

# Cloud Run deploy (first deploy creates the service)
gcloud run deploy youngheroes-server --source backend/ --region=$REGION \
  --project=$PROJECT --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=youngheroes-gemini-api-key:latest

# Grant the Cloud Run service's own service account Firestore access
SERVICE_SA=$(gcloud run services describe youngheroes-server --region=$REGION \
  --project=$PROJECT --format='value(spec.template.spec.serviceAccountName)')
gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:${SERVICE_SA}" --role=roles/datastore.user

# Frontend build + Hosting deploy
cd frontend && npm ci && npm run build && cd -
firebase deploy --only hosting:youngheroes --project=$PROJECT
```

## Custom domain (youngheroes.vietrochack.com)

`firebase-tools` has no CLI command for this — use the REST API:

```bash
TOKEN=$(gcloud auth print-access-token)
curl -s -X POST \
  "https://firebasehosting.googleapis.com/v1beta1/projects/vietrochack-lab/sites/vietrochack-youngheroes/customDomains?customDomainId=youngheroes.vietrochack.com" \
  -H "Authorization: Bearer $TOKEN" -H "X-Goog-User-Project: vietrochack-lab" \
  -H "Content-Type: application/json" -d '{}'

# Poll for the exact CNAME/TXT records it wants, hand them to whoever manages
# vietrochack.com DNS:
curl -s \
  "https://firebasehosting.googleapis.com/v1beta1/projects/vietrochack-lab/sites/vietrochack-youngheroes/customDomains/youngheroes.vietrochack.com" \
  -H "Authorization: Bearer $TOKEN" -H "X-Goog-User-Project: vietrochack-lab"
```

**Already requested (2026-09-21).** `youngheroes.vietrochack.com` currently
points at **Vercel** (leftover from the old hackathon deploy), not Firebase —
whoever manages `vietrochack.com` DNS (Namecheap, per the migration guide)
needs to make these exact changes:

| Action | Type | Name | Value |
|---|---|---|---|
| **Remove** | CNAME | `youngheroes` | `21c96fb19f0274a1.vercel-dns-017.com` |
| **Add** | CNAME | `youngheroes` | `vietrochack-youngheroes.web.app` |
| **Add** | TXT | `_acme-challenge.youngheroes` | `3M2mYsrw4sVY8B9IOXb7HrOjeD0bGx1xBhLky6Xjazo` |

After the records are updated, poll the same GET above: `hostState` goes
`HOST_MISMATCH` → `HOST_ACTIVE`, `ownershipState` goes `OWNERSHIP_MISSING` →
`OWNERSHIP_ACTIVE`. Usually resolves well under 24h. (If the TXT/CNAME values
above ever need re-checking, re-run the GET — Google may rotate the exact
challenge token if too much time passes before DNS is updated.)

## Budget alert

```bash
gcloud billing budgets create \
  --billing-account=<billing account id> \
  --display-name="youngheroes budget" \
  --budget-amount=10USD --calendar-period=month \
  --filter-projects=projects/vietrochack-lab \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0 \
  --project=vietrochack-lab
```

## Abuse prevention

See `docs/adr/0006-abuse-prevention.md`. Rate limits and session limits live
in code (`backend/src/config.py`, overridable via env vars). These parts are
console setup:

- **Gemini spend cap.** In AI Studio (aistudio.google.com), open the **Spend**
  page, select the project that owns the Gemini key, find **Monthly spend
  cap**, click **Edit spend cap**, and save. Enforcement lags by about 10
  minutes, so set the cap below the most you can afford.
- **Restrict the Gemini API key.** In Cloud Console → APIs & Services →
  Credentials, open the key → **API restrictions** → **Restrict key** →
  choose only **Generative Language API** → Save. Leave application
  restrictions at None: the key is only used server-side, from Cloud Run.
- **Firestore TTL for rate-limit counters (optional cleanup):**
  ```bash
  gcloud firestore fields ttls update expiresAt \
    --collection-group=rateLimits --enable-ttl \
    --database=youngheroes --project=vietrochack-lab
  ```
- **Turning on App Check:**
  1. Firebase console → Project settings → add a **Web app** if there
     isn't one yet. Note its `apiKey` and `appId`.
  2. Cloud Console → Security → reCAPTCHA → create a **Website** key for
     `youngheroes.vietrochack.com`, `vietrochack-youngheroes.web.app`,
     `vietrochack-youngheroes.firebaseapp.com` (and `localhost` if needed).
  3. Firebase console → App Check → register the web app with the
     **reCAPTCHA Enterprise** provider and that site key.
  4. GitHub repo → Settings → Variables → add `VITE_FIREBASE_API_KEY`,
     `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_PROJECT_ID` (`vietrochack-lab`)
     and `VITE_RECAPTCHA_SITE_KEY`. For local dev, put them in
     `frontend/.env.local`.
  5. Deploy and confirm `/api/new_call` requests carry an
     `X-Firebase-AppCheck` header (App Check console metrics should show
     verified requests).
  6. Grant the Cloud Run service account the **Firebase App Check Token
     Verifier** role (`roles/firebaseappcheck.tokenVerifier`), which the
     `consume=True` replay check needs. Then enforce:
     `gcloud run services update youngheroes-server --region=us-central1
     --update-env-vars=APP_CHECK_ENFORCE=true --project=vietrochack-lab`.
     Later `gcloud run deploy` runs keep existing env vars, so this persists.

## CI/CD (GitHub Actions, Workload Identity Federation)

Service account `gh-actions-deploy-youngheroes`, a new OIDC provider named
`youngheroes` inside the existing shared `github` workload identity pool
(already used by RocMap/SwipeAndFly), repo `VietRocHack/YoungHeroes`. See
`migration-guide`'s CI/CD section for the exact commands — same pattern, this
app's names substituted in. Roles granted match the guide's list, plus
`roles/datastore.user` for Firestore writes from CI-triggered health checks
if any are added later.

## Local dev

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env   # fill in GEMINI_API_KEY
python -m venv env && env/Scripts/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8080

# Terminal 2 — frontend
cd frontend
npm install
npm run dev   # http://localhost:3000, proxies /api/** to :8080 (vite.config.js)
```

## Verification checklist after any deploy

- Load the live URL (`https://youngheroes.vietrochack.com` once DNS is live,
  otherwise the Hosting default URL) fresh, not from cache.
- Home → Simulate → Start Practice → the big red call button → allow mic
  access → Start Call → speak → confirm the dispatcher replies with audio and
  the conversation progresses; End Call → confirm the call result screen
  shows a real duration/summary.
- Home → Skills → Recognize → play through to a "Call 911" ending → confirm
  the result screen shows a real heart/star count, not a fixed "Excellent!".
- Home → Skills → Communicate → answer all 4 questions → confirm Continue is
  disabled until an option is picked, and the result screen recaps the actual
  answers chosen.
- Check the browser network tab: all calls hit relative `/api/...` and return
  200s, no CORS errors, no `cloudfunctions.net`/`vercel.app` URLs anywhere.
- Try at ~375px, ~768px, and ~1280px+ widths — the phone card should never
  clip or overflow, and desktop should look intentional, not like an accident
  floating in gray space.
