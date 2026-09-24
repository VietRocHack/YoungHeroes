import os

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GCP_PROJECT = os.environ.get("GCP_PROJECT", "vietrochack-lab")
FIRESTORE_DATABASE = os.environ.get("FIRESTORE_DATABASE", "youngheroes")

# Pinned model names drift out from under you as Google's catalog moves on —
# gemini-2.5-flash (and its preview-tts/image siblings) all 404'd with
# "no longer available to new users" as of 2026-09. `gemini-flash-latest` is
# an alias Google keeps pointed at the current stable flash model; the TTS/
# image models don't have a "-latest" alias, so those need bumping by hand
# occasionally — check `client.models.list()` if either starts 404ing.
DISPATCHER_MODEL = os.environ.get("DISPATCHER_MODEL", "gemini-flash-latest")
TTS_MODEL = os.environ.get("TTS_MODEL", "gemini-3.1-flash-tts-preview")
TTS_VOICE = os.environ.get("TTS_VOICE", "Kore")
IMAGE_MODEL = os.environ.get("IMAGE_MODEL", "gemini-3.1-flash-image")

# The Live API call flow (docs/adr/0005-live-api-for-voice-call.md) uses one
# native audio-to-audio model instead of the DISPATCHER_MODEL/TTS_MODEL
# cascade above. Both flows are kept side by side with a frontend toggle
# (PracticeCall.jsx) until the Live flow has had real-device voice testing.
LIVE_MODEL = os.environ.get("LIVE_MODEL", "gemini-3.8-live")
