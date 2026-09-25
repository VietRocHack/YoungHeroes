#!/usr/bin/env bash
set -euo pipefail

# Deploys the backend to Cloud Run and the frontend to Firebase Hosting's
# "youngheroes" site, both in the vietrochack-lab GCP project. See
# docs/adr/0001-deploy-topology.md for why, and docs/runbook.md for the
# one-time setup this script assumes is already done.
#
# Run from anywhere: bash scripts/deploy.sh

cd "$(dirname "${BASH_SOURCE[0]}")/.."  # repo root

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-vietrochack-lab}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-youngheroes-server}"

echo "==> Checking required tools..."
command -v gcloud >/dev/null || {
  echo "gcloud CLI not found — https://cloud.google.com/sdk/docs/install"
  exit 1
}
command -v firebase >/dev/null || {
  echo "firebase CLI not found — run: npm install -g firebase-tools"
  exit 1
}

echo "==> Deploying backend to Cloud Run"
echo "    service: $SERVICE_NAME   project: $PROJECT_ID   region: $REGION"
gcloud run deploy "$SERVICE_NAME" \
  --source=backend \
  --region "$REGION" \
  --allow-unauthenticated \
  --max-instances=3 \
  --concurrency=20 \
  --timeout=300 \
  --set-secrets=GEMINI_API_KEY=youngheroes-gemini-api-key:latest \
  --project "$PROJECT_ID"

echo "==> Building frontend..."
(cd frontend && npm ci && npm run build)

echo "==> Deploying frontend to Firebase Hosting (youngheroes site)"
firebase deploy --only hosting:youngheroes --project "$PROJECT_ID"

echo ""
echo "==> Done."
echo "Live at: https://youngheroes.vietrochack.com"
echo ""
echo "Reminder: docs/runbook.md has the one-time setup checklist (DNS,"
echo "budget alert, secrets) if this is the first deploy."
