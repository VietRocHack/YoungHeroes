// Always same-origin: Firebase Hosting rewrites /api/** to the Cloud Run
// backend in production, and vite.config.js proxies it to a local backend
// in dev (see docs/runbook.md).
const base = '/api';

export const api = {
  newCall: () => `${base}/new_call`,
  callLive: (callId) => {
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${scheme}://${window.location.host}${base}/call/${encodeURIComponent(callId)}/live`;
  },
};
