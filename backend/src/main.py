import uuid

from fastapi import FastAPI, File, Form, HTTPException, Query, Request, UploadFile, WebSocket
from fastapi.responses import JSONResponse, Response

from . import config, guards
from .services import dispatcher, live_call, voice
from .store import call_store

app = FastAPI(title="YoungHeroes backend")


@app.get("/api")
def root():
    return {"status": "ok"}


@app.get("/api/new_call")
def new_call(request: Request):
    # Every paid endpoint below requires a call ID from here, so this is the
    # one place that needs App Check and rate limiting — see
    # docs/adr/0006-abuse-prevention.md.
    guards.verify_app_check(request)
    guards.enforce_new_call_rate_limit(request)
    call_id = str(uuid.uuid4())
    call_store.create_call(call_id)
    return Response(content=call_id, media_type="text/plain")


@app.websocket("/api/call/{call_id}/live")
async def call_live(websocket: WebSocket, call_id: str):
    """Real-time voice call over Gemini's Live API — see
    docs/adr/0005-live-api-for-voice-call.md. Kept side by side with the
    classic /api/tts + /api/stt cascade below behind a frontend toggle
    (PracticeCall.jsx) until the Live flow gets real-device voice testing."""
    await live_call.run_live_call(websocket, call_id)


@app.get("/api/tts")
def tts(text: str = Query(..., max_length=config.CLASSIC_MAX_TEXT_CHARS), callId: str = Query(...)):
    call = guards.require_open_call(callId)
    if len(call.get("history", [])) // 2 >= config.CLASSIC_MAX_TURNS:
        raise HTTPException(status_code=403, detail="Call turn limit reached")
    turn = dispatcher.run_turn(callId, text)
    audio_bytes = voice.synthesize_speech(turn.message)
    return Response(content=audio_bytes, media_type="audio/wav")


@app.get("/api/get_call_states")
def get_call_states(callId: str = Query(...)):
    call = call_store.get_call(callId) or {}
    return JSONResponse([call.get("isFinished", False), call.get("isPrankCall", False)])


@app.post("/api/stt")
async def stt(audio: UploadFile = File(...), callId: str = Form(...)):
    guards.require_open_call(callId)
    audio_bytes = await audio.read(config.STT_MAX_UPLOAD_BYTES + 1)
    if len(audio_bytes) > config.STT_MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Recording too long")
    mime_type = audio.content_type or "audio/webm"
    text = voice.transcribe_audio(audio_bytes, mime_type)
    return Response(content=text, media_type="text/plain")
