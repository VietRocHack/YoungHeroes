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
            "history": [],
            "isFinished": False,
            "isPrankCall": False,
            "createdAt": datetime.now(timezone.utc),
        }
    )


def get_call(call_id: str) -> Optional[dict]:
    doc = get_db().collection(COLLECTION).document(call_id).get()
    return doc.to_dict() if doc.exists else None


def append_turn(call_id: str, user_text: str, dispatcher_message: str, is_finished: bool, is_prank_call: bool) -> None:
    ref = get_db().collection(COLLECTION).document(call_id)
    call = ref.get().to_dict() or {"history": []}
    history = call.get("history", [])
    history.append({"role": "user", "text": user_text})
    history.append({"role": "model", "text": dispatcher_message})
    ref.set(
        {
            "history": history,
            "isFinished": is_finished,
            "isPrankCall": is_prank_call,
            "updatedAt": datetime.now(timezone.utc),
        },
        merge=True,
    )
