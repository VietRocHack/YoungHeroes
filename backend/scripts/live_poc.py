"""Throwaway proof-of-concept for docs/adr/0005-live-api-for-voice-call.md
step 1: confirm client.aio.live.connect() works against gemini-3.8-live with
our system instruction + an end_call tool, before touching production code.

Sends a couple of text turns (not real mic audio yet — this is just to prove
connection lifecycle, streamed audio output, and function calling all work)
and prints what comes back.

Usage:
    python backend/scripts/live_poc.py
"""

import asyncio
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from google.genai import types  # noqa: E402

from src.services.gemini_client import get_client  # noqa: E402

END_CALL_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="end_call",
            description="Call this when the practice 911 call should end.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "is_prank_call": types.Schema(
                        type="BOOLEAN",
                        description="True if the child was clearly joking/pranking instead of practicing.",
                    ),
                },
                required=["is_prank_call"],
            ),
        )
    ]
)

SYSTEM_INSTRUCTION = """\
You are the voice of a 911 dispatcher inside a training simulation for
children aged 4 to 12. Stay warm, calm, and brief. Open with a short
"911, what's your emergency?" style line. Ask one question at a time. When
the child has given you a location and a description of the emergency (or
after at most 4 exchanges), call the end_call tool with is_prank_call=false
and say a warm goodbye. If the child is clearly just joking around, call
end_call with is_prank_call=true.
"""

CONFIG = types.LiveConnectConfig(
    response_modalities=[types.Modality.AUDIO],
    system_instruction=types.Content(parts=[types.Part.from_text(text=SYSTEM_INSTRUCTION)]),
    tools=[END_CALL_TOOL],
)


async def main() -> None:
    client = get_client()
    async with client.aio.live.connect(model="gemini-3.8-live", config=CONFIG) as session:
        print("connected. sending <START>...")
        await session.send(input="<START>", end_of_turn=True)

        audio_bytes_total = 0
        async for message in session.receive():
            if message.server_content and message.server_content.model_turn:
                for part in message.server_content.model_turn.parts:
                    if part.inline_data:
                        audio_bytes_total += len(part.inline_data.data)
                    if part.text:
                        print("text part:", part.text)
            if message.server_content and message.server_content.turn_complete:
                print(f"turn complete. received {audio_bytes_total} bytes of audio so far.")
                break
            if message.tool_call:
                print("TOOL CALL:", message.tool_call.function_calls)
                break

        print("sending a fire emergency description...")
        await session.send(
            input="There's a fire in my kitchen! I'm at 123 Maple Street.",
            end_of_turn=True,
        )
        audio_bytes_total = 0
        async for message in session.receive():
            if message.server_content and message.server_content.model_turn:
                for part in message.server_content.model_turn.parts:
                    if part.inline_data:
                        audio_bytes_total += len(part.inline_data.data)
                    if part.text:
                        print("text part:", part.text)
            if message.server_content and message.server_content.turn_complete:
                print(f"turn complete. received {audio_bytes_total} bytes of audio so far.")
                break
            if message.tool_call:
                print("TOOL CALL:", message.tool_call.function_calls)
                break

    print("done.")


if __name__ == "__main__":
    asyncio.run(main())
