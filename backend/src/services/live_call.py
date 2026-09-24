"""Real-time voice-call handling via Gemini's Live API â€” see
docs/adr/0005-live-api-for-voice-call.md. Replaces the old cascaded
dispatcher.run_turn() + voice.synthesize_speech()/transcribe_audio() flow
with one persistent, full-duplex audio session per call.

The browser streams raw 16-bit PCM mic audio to us over a WebSocket; we
relay it to Gemini and stream its spoken audio straight back. The model
signals the end of the call via an `end_call` tool call (there's no
JSON-schema side-channel on native audio responses the way there was on
dispatcher.py's text-based turns), which we use to record the outcome in
Firestore the same way dispatcher.py did per-turn.
"""

import asyncio
import json
import logging

from fastapi import WebSocket
from google.genai import types

from .. import config
from ..store import call_store
from .gemini_client import get_client

logger = logging.getLogger(__name__)

# Matches PracticeCall.jsx's mic capture â€” see frontend/src/lib/audio.js.
_INPUT_MIME_TYPE = "audio/pcm;rate=16000"

_END_CALL_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="end_call",
            description=(
                "Call this exactly once, when the practice 911 call should end â€” either "
                "because the child gave a location and described the emergency (or you've "
                "asked at most 4-5 questions), or because they were clearly just pranking."
            ),
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "is_prank_call": types.Schema(
                        type="BOOLEAN",
                        description="True if the child was clearly joking/pranking instead of practicing a real scenario.",
                    ),
                },
                required=["is_prank_call"],
            ),
        )
    ]
)

# Adapted from dispatcher.py's SYSTEM_INSTRUCTION for a continuous, barge-in
# capable conversation instead of discrete request/response turns, and
# end_call replaces the isFinished/isPrankCall JSON fields since native audio
# responses have no structured side-channel.
_SYSTEM_INSTRUCTION = """\
You are the voice of a 911 dispatcher inside a training simulation for children
aged 4 to 12 who are learning how to handle a real emergency call. The "caller"
is a child practicing; nothing said here is a real emergency.

Stay in character as a calm, warm, patient dispatcher. Your job in the
simulation:
- Open the call with a short, friendly "911, what's your emergency?" style line.
- Ask one clear question at a time (what happened, where they are, if anyone is
  hurt, their name) so the child practices giving that information out loud.
- Praise the child briefly when they give useful information (location, what's
  wrong). Keep every line short and easy for a young child to follow â€” one or
  two sentences, simple words, no jargon.
- Never say anything scary, graphic, or that could frighten a young child.
- This is a real-time conversation, not a turn-by-turn exchange â€” if the child
  starts talking while you're mid-sentence, stop and listen; don't talk over them.
- If the child gives you a location and describes the emergency clearly (or
  after at most 5-6 of your turns), wrap up warmly: tell them help is on the
  way and they did a great job, then call end_call with is_prank_call=false.
- If the child is clearly just joking around, being silly, or says things like
  "just kidding" / "this isn't real" repeatedly instead of practicing the
  scenario, gently explain that real 911 calls should never be a prank because
  it takes help away from people who need it, then call end_call with
  is_prank_call=true.
- The very first message you receive will be the literal text "<START>" â€” that
  means the child just picked up the phone; open the call, don't repeat it back.
"""

_LIVE_CONFIG = types.LiveConnectConfig(
    response_modalities=[types.Modality.AUDIO],
    system_instruction=types.Content(parts=[types.Part.from_text(text=_SYSTEM_INSTRUCTION)]),
    tools=[_END_CALL_TOOL],
)


async def _relay_from_client(websocket: WebSocket, session, stop_event: asyncio.Event) -> None:
    """Forward mic audio frames from the browser to the Gemini session. A
    text frame (rather than binary audio) is treated as a manual hangup â€”
    PracticeCall.jsx's "End Call" button â€” same as today's handleEndCall."""
    try:
        while not stop_event.is_set():
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                return
            data = message.get("bytes")
            if data is not None:
                await session.send_realtime_input(
                    audio=types.Blob(data=data, mime_type=_INPUT_MIME_TYPE)
                )
            elif message.get("text") is not None:
                return
    finally:
        stop_event.set()


_GOODBYE_DRAIN_TIMEOUT_S = 10


async def _drain_goodbye(websocket: WebSocket, session) -> None:
    """end_call often arrives mid-turn, with the model's spoken wrap-up ("help
    is on the way, you did great") still streaming or only starting after the
    tool response. Keep forwarding audio until that turn completes, so the
    child actually hears the goodbye instead of it being cut off."""

    async def drain() -> None:
        async for message in session.receive():
            content = message.server_content
            if content and content.model_turn:
                for part in content.model_turn.parts:
                    if part.inline_data:
                        await websocket.send_bytes(part.inline_data.data)
            if content and content.turn_complete:
                return

    try:
        await asyncio.wait_for(drain(), timeout=_GOODBYE_DRAIN_TIMEOUT_S)
    except asyncio.TimeoutError:
        logger.warning("Timed out waiting for the model's goodbye to finish")


async def _relay_from_model(
    websocket: WebSocket, session, call_id: str, stop_event: asyncio.Event
) -> bool | None:
    """Forward the model's spoken audio to the browser, and watch for the
    end_call tool call. Returns end_call's is_prank_call value, or None if the
    call stopped some other way (e.g. the child hung up)."""
    # session.receive() only yields messages up to the end of one model turn
    # (turn_complete) and then returns — it does not stay open for the whole
    # session. Re-enter it every turn, or the relay silently goes deaf right
    # after the greeting and the call ends before the child can answer.
    while not stop_event.is_set():
        async for message in session.receive():
            content = message.server_content
            if content:
                if content.interrupted:
                    # Barge-in: the child started talking, the model's own turn
                    # was cut short — tell the frontend to stop playback of
                    # whatever audio it already has queued.
                    await websocket.send_text(json.dumps({"type": "interrupted"}))
                if content.model_turn:
                    for part in content.model_turn.parts:
                        if part.inline_data:
                            await websocket.send_bytes(part.inline_data.data)

            if message.tool_call:
                for call in message.tool_call.function_calls:
                    if call.name == "end_call":
                        await session.send_tool_response(
                            function_responses=[
                                types.FunctionResponse(id=call.id, name=call.name, response={"ok": True})
                            ]
                        )
                        await _drain_goodbye(websocket, session)
                        stop_event.set()
                        return bool((call.args or {}).get("is_prank_call", False))

            if stop_event.is_set():
                break

    return None


async def run_live_call(websocket: WebSocket, call_id: str) -> None:
    await websocket.accept()
    stop_event = asyncio.Event()
    is_prank_call = False
    natural_end = False

    try:
        async with get_client().aio.live.connect(model=config.LIVE_MODEL, config=_LIVE_CONFIG) as session:
            await session.send_client_content(
                turns=types.Content(role="user", parts=[types.Part.from_text(text="<START>")]),
                turn_complete=True,
            )

            client_task = asyncio.create_task(_relay_from_client(websocket, session, stop_event))
            model_task = asyncio.create_task(_relay_from_model(websocket, session, call_id, stop_event))

            done, pending = await asyncio.wait(
                [client_task, model_task], return_when=asyncio.FIRST_COMPLETED
            )
            stop_event.set()
            for task in pending:
                task.cancel()

            if model_task in done and model_task.result() is not None:
                is_prank_call = model_task.result()
                natural_end = True
    except Exception:
        logger.exception("Live call %s ended with an error", call_id)
    finally:
        call_store.finish_live_call(call_id, is_prank_call)
        try:
            await websocket.send_text(
                json.dumps({"type": "ended", "isPrankCall": is_prank_call, "naturalEnd": natural_end})
            )
        except Exception:
            pass
        try:
            await websocket.close()
        except Exception:
            pass
