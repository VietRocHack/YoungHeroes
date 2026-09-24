import os

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GCP_PROJECT = os.environ.get("GCP_PROJECT", "vietrochack-lab")
FIRESTORE_DATABASE = os.environ.get("FIRESTORE_DATABASE", "youngheroes")

# Pinned model names drift out from under you as Google's catalog moves on —
# gemini-2.5-flash (and its preview-tts/image siblings) all 404'd with
# "no longer available to new users" as of 2026-09. `gemini-flash-latest` is
# an alias Google keeps pointed at the current stable flash model; the image
# model doesn't have a "-latest" alias, so it needs bumping by hand
# occasionally — check `client.models.list()` if it starts 404ing.
IMAGE_MODEL = os.environ.get("IMAGE_MODEL", "gemini-3.1-flash-image")

# The practice call flow (docs/adr/0005-live-api-for-voice-call.md) uses one
# native audio-to-audio model instead of a separate dispatcher/STT/TTS chain.
LIVE_MODEL = os.environ.get("LIVE_MODEL", "gemini-3.8-live")
