import uuid

from fastapi import FastAPI, WebSocket
from fastapi.responses import Response

from .services import live_call
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
    docs/adr/0005-live-api-for-voice-call.md."""
    await live_call.run_live_call(websocket, call_id)
