"""Diagnostic for a real bug report: user heard the greeting, spoke after it,
but the call ended without the model ever responding to what they said.

Feeds real synthesized speech into a Live session, sending audio and
draining receive() CONCURRENTLY (matching live_call.py's actual two-task
architecture) rather than sequentially, since a sequential
send-everything-then-listen test turned out to get zero response at all —
possibly because the session needs continuous receive() consumption to stay
healthy, not because the audio itself was rejected.

Usage:
    python backend/scripts/live_audio_input_test.py
"""

import asyncio
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from google.genai import types  # noqa: E402

from src.services.gemini_client import get_client  # noqa: E402
from src.services.live_call import _LIVE_CONFIG, _INPUT_MIME_TYPE  # noqa: E402

PCM_PATH = (
    pathlib.Path.home()
    / "AppData/Local/Temp/claude/C--Users-goodu-proj-YoungHeroes"
    / "6264a9ef-ff13-412c-b615-e755837d8762/scratchpad/audio_test/test_speech_16k.pcm"
)

CHUNK_SIZE = 4096


async def sender(session, pcm_bytes):
    chunk_bytes = CHUNK_SIZE * 2
    for i in range(0, len(pcm_bytes), chunk_bytes):
        chunk = pcm_bytes[i : i + chunk_bytes]
        await session.send_realtime_input(audio=types.Blob(data=chunk, mime_type=_INPUT_MIME_TYPE))
        await asyncio.sleep(0.1)
    print(f"[sender] done sending {len(pcm_bytes)} bytes")


async def receiver(session, stop_event):
    audio_bytes = 0
    # session.receive() exhausts itself after one turn_complete in this SDK
    # version rather than staying open for the whole session — confirmed by
    # this diagnostic. Re-entering it in an outer loop keeps listening
    # across multiple turns instead of silently going deaf after the first.
    while not stop_event.is_set():
        got_any_message = False
        async for message in session.receive():
            got_any_message = True
            summary = message.model_dump(
                exclude_none=True, exclude={"server_content": {"model_turn": {"parts"}}}
            )
            print("[receiver] message:", summary)
            if message.server_content and message.server_content.model_turn:
                for part in message.server_content.model_turn.parts:
                    if part.inline_data:
                        audio_bytes += len(part.inline_data.data)
            if message.tool_call:
                print("[receiver] TOOL CALL:", message.tool_call.function_calls)
                stop_event.set()
                break
            if stop_event.is_set():
                break
        print(f"[receiver] inner receive() generator exhausted (got_any_message={got_any_message})")
    print(f"[receiver] total response audio bytes: {audio_bytes}")


async def main() -> None:
    pcm_bytes = PCM_PATH.read_bytes()
    print(f"loaded {len(pcm_bytes)} bytes of 16kHz PCM test speech")

    async with get_client().aio.live.connect(model="gemini-3.8-live", config=_LIVE_CONFIG) as session:
        await session.send_client_content(
            turns=types.Content(role="user", parts=[types.Part.from_text(text="<START>")]),
            turn_complete=True,
        )

        stop_event = asyncio.Event()
        recv_task = asyncio.create_task(receiver(session, stop_event))

        # Give the greeting a few seconds to stream before we start talking
        # over it, same as a real child would wait to hear it first.
        await asyncio.sleep(6)
        print("--- now sending test speech while still listening ---")
        await sender(session, pcm_bytes)

        # Keep listening for a while after finishing the audio for a reply.
        print(">>> entering final wait_for")
        try:
            await asyncio.wait_for(recv_task, timeout=20)
            print(">>> recv_task completed normally (no exception)")
        except asyncio.TimeoutError:
            print(">>> TimeoutError: no tool call, no clean end within 20s")
            stop_event.set()
        except Exception as exc:
            print(f">>> recv_task raised: {type(exc).__name__}: {exc}")
        print(">>> main() reaching the end")


if __name__ == "__main__":
    asyncio.run(main())
