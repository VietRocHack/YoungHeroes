import uuid

from fastapi import FastAPI, File, Query, UploadFile, WebSocket
from fastapi.responses import JSONResponse, Response

from .services import dispatcher, live_call, voice
from .store import call_store

app = FastAPI(title="YoungHeroes backend")


@app.get("/api")
def root():
    return {"status": "ok"}


@app.get("/api/new_call")
def new_call():
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
def tts(text: str = Query(...), callId: str = Query(...)):
    turn = dispatcher.run_turn(callId, text)
    audio_bytes = voice.synthesize_speech(turn.message)
    return Response(content=audio_bytes, media_type="audio/wav")


@app.get("/api/get_call_states")
def get_call_states(callId: str = Query(...)):
    call = call_store.get_call(callId) or {}
    return JSONResponse([call.get("isFinished", False), call.get("isPrankCall", False)])


@app.post("/api/stt")
async def stt(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()
    mime_type = audio.content_type or "audio/webm"
    text = voice.transcribe_audio(audio_bytes, mime_type)
    return Response(content=text, media_type="text/plain")
