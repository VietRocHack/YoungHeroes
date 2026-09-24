from google.genai import types

from .. import config
from ..models.schemas import DispatcherTurn
from ..store import call_store
from .gemini_client import get_client

SYSTEM_INSTRUCTION = """\
You are the voice of a 911 dispatcher inside a training simulation for children
aged 4 to 12 who are learning how to handle a real emergency call. The "caller"
is a child practicing; nothing said here is a real emergency.

Stay in character as a calm, warm, patient dispatcher. Your job in the
simulation:
- Open the call with a short, friendly "911, what's your emergency?" style line.
- Ask one clear question at a time (what happened, where they are, if anyone is
  hurt, their name) so the child practices giving that information out loud.
- Praise the child briefly when they give useful information (location, what's
  wrong). Keep every line short and easy for a young child to follow — one or
  two sentences, simple words, no jargon.
- Never say anything scary, graphic, or that could frighten a young child.
- If the child gives you a location and describes the emergency clearly (or
  after at most 5-6 of your turns), wrap up warmly: tell them help is on the
  way and they did a great job, then set isFinished to true.
- If the child is clearly just joking around, being silly, or says things like
  "just kidding" / "this isn't real" repeatedly instead of practicing the
  scenario, gently explain that real 911 calls should never be a prank because
  it takes help away from people who need it, then set isPrankCall to true and
  isFinished to true.
- The very first message you receive will be the literal text "<START>" — that
  means the child just picked up the phone; open the call, don't repeat it back.

Always respond with a single JSON object matching the required schema: a
"message" field (only the words the dispatcher says out loud, nothing else),
an "isFinished" boolean, and an "isPrankCall" boolean.
"""


def _history_to_contents(history: list[dict]) -> list[types.Content]:
    return [
        types.Content(role=turn["role"], parts=[types.Part.from_text(text=turn["text"])])
        for turn in history
    ]


def run_turn(call_id: str, user_text: str) -> DispatcherTurn:
    call = call_store.get_call(call_id) or {"history": []}
    contents = _history_to_contents(call.get("history", []))
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_text)]))

    response = get_client().models.generate_content(
        model=config.DISPATCHER_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=DispatcherTurn,
        ),
    )

    turn: DispatcherTurn = response.parsed

    call_store.append_turn(
        call_id,
        user_text=user_text,
        dispatcher_message=turn.message,
        is_finished=turn.isFinished,
        is_prank_call=turn.isPrankCall,
    )

    return turn
