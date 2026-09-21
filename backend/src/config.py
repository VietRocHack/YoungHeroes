import os

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GCP_PROJECT = os.environ.get("GCP_PROJECT", "vietrochack-lab")
FIRESTORE_DATABASE = os.environ.get("FIRESTORE_DATABASE", "youngheroes")

DISPATCHER_MODEL = os.environ.get("DISPATCHER_MODEL", "gemini-2.5-flash")
TTS_MODEL = os.environ.get("TTS_MODEL", "gemini-2.5-flash-preview-tts")
TTS_VOICE = os.environ.get("TTS_VOICE", "Kore")
IMAGE_MODEL = os.environ.get("IMAGE_MODEL", "gemini-2.5-flash-image")
