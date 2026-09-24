"""Throwaway test for docs/adr/0005-live-api-for-voice-call.md step 3: drive
the new WS /api/call/{call_id}/live endpoint end-to-end (no real browser/mic
needed) using FastAPI's TestClient.

Validates the WebSocket plumbing itself (connect, greeting audio streams
back, a text frame triggers a clean manual hangup, Firestore gets updated,
server closes). The underlying Gemini session + end_call tool-calling
mechanism is already validated directly by live_poc.py — reproducing a real
spoken conversation here would need actual recorded audio, not worth faking
for this check.

Usage:
    python backend/scripts/live_ws_test.py
"""

import pathlib
import sys
import time
import uuid

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from src.main import app  # noqa: E402
from src.store import call_store  # noqa: E402

call_id = str(uuid.uuid4())
call_store.create_call(call_id)
print("call_id:", call_id)

client = TestClient(app)

with client.websocket_connect(f"/api/call/{call_id}/live") as ws:
    print("connected, waiting for greeting audio...")
    audio_bytes = 0
    start = time.time()
    # Drain audio frames for a couple seconds to let the opening greeting
    # stream through, then send a hangup.
    while time.time() - start < 3:
        try:
            msg = ws.receive()
        except Exception as exc:  # queue timeout from starlette's testclient
            print("receive stopped:", exc)
            break
        if "bytes" in msg and msg["bytes"] is not None:
            audio_bytes += len(msg["bytes"])
        elif "text" in msg and msg["text"] is not None:
            print("unexpected text frame during greeting:", msg["text"])

    print(f"received {audio_bytes} bytes of greeting audio, sending hangup...")
    ws.send_text("hangup")

    ended_message = None
    for _ in range(20):
        msg = ws.receive()
        if "text" in msg and msg["text"] is not None:
            ended_message = msg["text"]
            print("text frame:", ended_message)
        if msg.get("type") == "websocket.close":
            print("server closed:", msg)
            break

print("ended message:", ended_message)
call = call_store.get_call(call_id)
print("final Firestore doc:", call)
