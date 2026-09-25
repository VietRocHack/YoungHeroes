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

# Abuse prevention — see docs/adr/0006-abuse-prevention.md. Every limit here
# exists to cap how much Gemini spend one caller (or everyone at once) can
# trigger; the AI Studio spend cap is the hard backstop behind all of them.

# Browser origins allowed to open the Live call WebSocket. It connects
# straight to Cloud Run (not through Hosting — see frontend/src/lib/api.js),
# so this is the only thing stopping another site from embedding it.
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "ALLOWED_ORIGINS",
        "https://youngheroes.vietrochack.com,"
        "https://vietrochack-youngheroes.web.app,"
        "https://vietrochack-youngheroes.firebaseapp.com,"
        "http://localhost:3000",
    ).split(",")
    if o.strip()
]

# A practice call is a couple of minutes; anything past this is abuse or a
# forgotten tab. Keep LIVE_MAX_CALL_SECONDS under Cloud Run's --timeout
# (300s in scripts/deploy.sh) so we end the call cleanly before Cloud Run
# cuts the socket.
LIVE_MAX_CALL_SECONDS = int(os.environ.get("LIVE_MAX_CALL_SECONDS", "240"))
# The browser streams mic audio continuously (silence included), so a gap
# this long means the client stopped sending, not that the child went quiet.
LIVE_IDLE_SECONDS = int(os.environ.get("LIVE_IDLE_SECONDS", "30"))
# One 256ms 16kHz 16-bit PCM chunk is ~8KB; anything far bigger isn't mic audio.
LIVE_MAX_FRAME_BYTES = int(os.environ.get("LIVE_MAX_FRAME_BYTES", str(64 * 1024)))
# A call ID must be used within this long of /api/new_call issuing it.
CALL_ID_MAX_AGE_SECONDS = int(os.environ.get("CALL_ID_MAX_AGE_SECONDS", "600"))

# Classic flow (/api/tts + /api/stt) limits.
CLASSIC_MAX_TURNS = int(os.environ.get("CLASSIC_MAX_TURNS", "10"))
CLASSIC_MAX_TEXT_CHARS = int(os.environ.get("CLASSIC_MAX_TEXT_CHARS", "500"))
STT_MAX_UPLOAD_BYTES = int(os.environ.get("STT_MAX_UPLOAD_BYTES", str(2 * 1024 * 1024)))

# /api/new_call rate limits, per hour. Per-IP is generous because a whole
# classroom can share one school IP; the global cap bounds total spend even
# if an attacker rotates IPs or spoofs the client-IP header.
NEW_CALLS_PER_IP_PER_HOUR = int(os.environ.get("NEW_CALLS_PER_IP_PER_HOUR", "20"))
NEW_CALLS_GLOBAL_PER_HOUR = int(os.environ.get("NEW_CALLS_GLOBAL_PER_HOUR", "300"))

# Firebase App Check on /api/new_call. Off until the reCAPTCHA Enterprise key
# is registered and the frontend ships tokens — see docs/runbook.md.
APP_CHECK_ENFORCE = os.environ.get("APP_CHECK_ENFORCE", "false").lower() == "true"
