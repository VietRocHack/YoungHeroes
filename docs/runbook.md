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
