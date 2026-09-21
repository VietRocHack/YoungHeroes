"""Manual smoke test against a running local server (not wired into CI).

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

    resp = requests.get(f"{BASE}/tts", params={"text": "<START>", "callId": call_id})
    print("tts ->", resp.status_code, len(resp.content), "bytes audio")

    states = requests.get(f"{BASE}/get_call_states", params={"callId": call_id}).json()
    print("get_call_states ->", states)


if __name__ == "__main__":
    sys.exit(main())
