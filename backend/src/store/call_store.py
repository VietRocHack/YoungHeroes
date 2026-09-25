import hashlib
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Optional

from google.cloud import firestore

from .. import config

COLLECTION = "calls"
RATE_LIMIT_COLLECTION = "rateLimits"


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
    """Classic dispatcher flow only — see docs/adr/0005-live-api-for-voice-call.md."""
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


def _is_fresh(call: dict) -> bool:
    created_at = call.get("createdAt")
    if created_at is None:
        return False
    return datetime.now(timezone.utc) - created_at < timedelta(seconds=config.CALL_ID_MAX_AGE_SECONDS)


def is_call_open(call: Optional[dict]) -> bool:
    """A call ID is only honored if /api/new_call issued it recently and the
    call hasn't ended — see docs/adr/0006-abuse-prevention.md. Stops anyone
    from inventing IDs or replaying an old one to keep talking to Gemini."""
    return bool(call) and not call.get("isFinished", False) and _is_fresh(call)


def claim_live_session(call_id: str) -> bool:
    """Atomically mark a call as having its one Live session. Returns False if
    the ID is unknown, stale, finished, or already claimed — so one /api/new_call
    buys exactly one Live session, not an unlimited number of reconnects."""
    db = get_db()
    ref = db.collection(COLLECTION).document(call_id)

    @firestore.transactional
    def claim(transaction) -> bool:
        snapshot = ref.get(transaction=transaction)
        call = snapshot.to_dict() if snapshot.exists else None
        if not is_call_open(call) or call.get("liveSessionStarted"):
            return False
        transaction.update(ref, {"liveSessionStarted": datetime.now(timezone.utc)})
        return True

    return claim(db.transaction())


def hit_rate_limit(key: str, limit: int) -> bool:
    """Count one request against `key` in the current UTC hour. Returns True if
    that pushes it over `limit` (the request should be refused). Kept in
    Firestore, not memory, because Cloud Run instances come and go (ADR 0004).
    The key is hashed so no raw client IPs are stored. Set a Firestore TTL
    policy on `expiresAt` to have old buckets cleaned up automatically."""
    now = datetime.now(timezone.utc)
    bucket = now.strftime("%Y%m%d%H")
    doc_id = f"{hashlib.sha256(key.encode()).hexdigest()[:32]}_{bucket}"
    db = get_db()
    ref = db.collection(RATE_LIMIT_COLLECTION).document(doc_id)

    @firestore.transactional
    def increment(transaction) -> int:
        snapshot = ref.get(transaction=transaction)
        count = (snapshot.to_dict() or {}).get("count", 0) if snapshot.exists else 0
        count += 1
        transaction.set(ref, {"count": count, "expiresAt": now + timedelta(hours=2)})
        return count

    return increment(db.transaction()) > limit
