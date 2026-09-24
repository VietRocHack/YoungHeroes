"""Manual smoke test against a running local server (not wired into CI).

The practice call flow itself is a WebSocket (see
docs/adr/0005-live-api-for-voice-call.md) — exercise that with
backend/scripts/live_ws_test.py instead, which drives it in-process.

Usage:
    uvicorn src.main:app --reload &
    python tests/test_http.py
"""

import sys

import requests

BASE = "http://127.0.0.1:8080/api"


def main() -> None:
    call_id = requests.get(f"{BASE}/new_call").text
    print("new_call ->", call_id)


if __name__ == "__main__":
    sys.exit(main())
