from datetime import datetime, timezone
from functools import lru_cache
from typing import Optional

from google.cloud import firestore

from .. import config

COLLECTION = "calls"


@lru_cache(maxsize=1)
def get_db() -> firestore.Client:
    return firestore.Client(project=config.GCP_PROJECT, database=config.FIRESTORE_DATABASE)


def create_call(call_id: str) -> None:
    get_db().collection(COLLECTION).document(call_id).set(
        {
            "isFinished": False,
            "isPrankCall": False,
            "createdAt": datetime.now(timezone.utc),
        }
    )


def get_call(call_id: str) -> Optional[dict]:
    doc = get_db().collection(COLLECTION).document(call_id).get()
    return doc.to_dict() if doc.exists else None


def finish_live_call(call_id: str, is_prank_call: bool) -> None:
    """Live API calls are audio-to-audio with no per-turn text history to
    store (see docs/adr/0005-live-api-for-voice-call.md), so this just
    records the call's final outcome."""
    get_db().collection(COLLECTION).document(call_id).set(
        {
            "isFinished": True,
            "isPrankCall": is_prank_call,
            "updatedAt": datetime.now(timezone.utc),
        },
        merge=True,
    )
