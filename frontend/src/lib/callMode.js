// Toggle between the classic cascaded call flow and the new Live API one —
// see docs/adr/0005-live-api-for-voice-call.md. Live hasn't had real-device
// microphone testing yet, so it defaults to "classic" (known-working)
// with an opt-in toggle rather than the other way around.
const STORAGE_KEY = "callMode";

export function getCallMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "live" ? "live" : "classic";
  } catch {
    return "classic";
  }
}

export function setCallMode(mode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode === "live" ? "live" : "classic");
  } catch {
    // localStorage unavailable (private browsing, etc.) — the toggle just
    // won't persist across visits, not worth failing over.
  }
}
