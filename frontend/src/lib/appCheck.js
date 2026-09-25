// Firebase App Check — see docs/adr/0006-abuse-prevention.md. Proves a
// /api/new_call request came from this app in a real browser, not a script.
// Stays inert until the VITE_FIREBASE_* / VITE_RECAPTCHA_SITE_KEY build vars
// are set (docs/runbook.md), so local dev and builds without them still work;
// the backend only requires the token once APP_CHECK_ENFORCE=true.
import { initializeApp } from 'firebase/app';
import { getLimitedUseToken, initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};
const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

let appCheck = null;
if (firebaseConfig.apiKey && firebaseConfig.appId && siteKey) {
  appCheck = initializeAppCheck(initializeApp(firebaseConfig), {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: false, // we only ever use limited-use tokens
  });
}

// A fresh single-use token per call: the backend consumes it on verify, so a
// token copied out of the browser can't be replayed.
export async function appCheckHeaders() {
  if (!appCheck) return {};
  try {
    const { token } = await getLimitedUseToken(appCheck);
    return { 'X-Firebase-AppCheck': token };
  } catch (err) {
    console.error('App Check token unavailable', err);
    return {};
  }
}
