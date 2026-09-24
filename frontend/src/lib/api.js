// Same-origin for plain HTTP: Firebase Hosting rewrites /api/** to the Cloud
// Run backend in production, and vite.config.js proxies it to a local
// backend in dev (see docs/runbook.md).
const base = '/api';

// Firebase Hosting's rewrite proxy does NOT forward the WebSocket upgrade
// handshake — it strips it down to a plain HTTP GET, which hits our
// WebSocket-only route and 404s (confirmed against both the .web.app and
// custom domain in prod, 2026-09-24). So the live call connects straight to
// Cloud Run instead of through Hosting; everything else stays same-origin.
// Local dev instead relies on vite.config.js's ws: true proxy option, which
// (unlike Hosting) does forward the upgrade correctly.
const CLOUD_RUN_HOST = 'youngheroes-server-246457606106.us-central1.run.app';

export const api = {
  newCall: () => `${base}/new_call`,
  // Classic flow only (PracticeCallClassic.jsx) — see docs/adr/0005-live-api-for-voice-call.md.
  tts: (text, callId) =>
    `${base}/tts?text=${encodeURIComponent(text)}&callId=${encodeURIComponent(callId)}`,
  getCallStates: (callId) => `${base}/get_call_states?callId=${encodeURIComponent(callId)}`,
  stt: () => `${base}/stt`,
  callLive: (callId) => {
    const isLocalDev = window.location.hostname === 'localhost';
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = isLocalDev ? window.location.host : CLOUD_RUN_HOST;
    return `${scheme}://${host}${base}/call/${encodeURIComponent(callId)}/live`;
  },
};
