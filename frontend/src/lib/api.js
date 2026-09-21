// Always same-origin: Firebase Hosting rewrites /api/** to the Cloud Run
// backend in production, and next.config.js proxies it to a local backend
// in dev (see docs/runbook.md).
const base = '/api';

export const api = {
  newCall: () => `${base}/new_call`,
  tts: (text, callId) =>
    `${base}/tts?text=${encodeURIComponent(text)}&callId=${encodeURIComponent(callId)}`,
  getCallStates: (callId) => `${base}/get_call_states?callId=${encodeURIComponent(callId)}`,
  stt: () => `${base}/stt`,
};
