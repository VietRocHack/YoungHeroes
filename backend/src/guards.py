"""Request-level abuse checks — see docs/adr/0006-abuse-prevention.md."""

import logging
from functools import lru_cache
from typing import Optional

from fastapi import HTTPException, Request
from starlette.requests import HTTPConnection

from . import config
from .store import call_store

logger = logging.getLogger(__name__)


def client_ip(conn: HTTPConnection) -> str:
    """Best-effort client IP. Requests through Firebase Hosting arrive with the
    real client in Fastly-Client-IP (X-Forwarded-For's last hop is Hosting's
    CDN); requests straight to Cloud Run have the client as X-Forwarded-For's
    last hop (Google's front end appends it). Both headers can be forged by
    someone who calls Cloud Run directly, which is why the per-IP limit is
    paired with a global one and App Check."""
    fastly_ip = conn.headers.get("fastly-client-ip")
    if fastly_ip:
        return fastly_ip.strip()
    forwarded = conn.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return conn.client.host if conn.client else "unknown"


def is_allowed_origin(conn: HTTPConnection) -> bool:
    return conn.headers.get("origin") in config.ALLOWED_ORIGINS


@lru_cache(maxsize=1)
def _firebase_app():
    import firebase_admin

    return firebase_admin.initialize_app(options={"projectId": config.GCP_PROJECT})


def verify_app_check(request: Request) -> None:
    """Require a limited-use App Check token, consumed on first use so a token
    lifted out of the browser can't be replayed from a script."""
    if not config.APP_CHECK_ENFORCE:
        return
    from firebase_admin import app_check

    token: Optional[str] = request.headers.get("x-firebase-appcheck")
    if not token:
        raise HTTPException(status_code=401, detail="Missing App Check token")
    try:
        claims = app_check.verify_token(token, app=_firebase_app(), consume=True)
    except Exception:
        logger.info("Rejected invalid App Check token")
        raise HTTPException(status_code=401, detail="Invalid App Check token")
    if claims.get("already_consumed"):
        raise HTTPException(status_code=401, detail="App Check token already used")


def enforce_new_call_rate_limit(request: Request) -> None:
    # Per-IP first, so one noisy caller's rejected requests don't also use up
    # the global budget everyone else shares.
    if call_store.hit_rate_limit(f"ip:{client_ip(request)}", config.NEW_CALLS_PER_IP_PER_HOUR):
        raise HTTPException(status_code=429, detail="Too many calls, try again later")
    if call_store.hit_rate_limit("global", config.NEW_CALLS_GLOBAL_PER_HOUR):
        logger.warning("Global /api/new_call limit reached")
        raise HTTPException(status_code=429, detail="Too many calls right now, try again later")


def require_open_call(call_id: str) -> dict:
    call = call_store.get_call(call_id)
    if not call_store.is_call_open(call):
        raise HTTPException(status_code=403, detail="Unknown or finished call")
    return call
