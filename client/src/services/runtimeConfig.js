const FALLBACK_API_URL = String(process.env.REACT_APP_API_URL || '/api/v1').trim();
const FALLBACK_GOOGLE_CLIENT_ID = String(process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
const FALLBACK_ATOZAS_SSO_ENABLED = process.env.REACT_APP_ATOZAS_SSO_ENABLED !== 'false';

const normalizeApiUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return '/api/v1';
  return url.replace(/\/+$/, '');
};

const APP_CONFIG_ENDPOINT = `${normalizeApiUrl(FALLBACK_API_URL)}/app-config`;

let runtimeConfig = {
  apiUrl: normalizeApiUrl(FALLBACK_API_URL),
  googleClientId: FALLBACK_GOOGLE_CLIENT_ID,
  atozasSsoEnabled: FALLBACK_ATOZAS_SSO_ENABLED,
  atozasAutoRedirect: false,
};

let loadPromise = null;

export const getRuntimeConfig = () => runtimeConfig;

export const loadRuntimeConfig = async () => {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(APP_CONFIG_ENDPOINT, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) return runtimeConfig;

      const data = await response.json();
      runtimeConfig = {
        apiUrl: normalizeApiUrl(data?.apiUrl || runtimeConfig.apiUrl),
        googleClientId: String(data?.googleClientId || runtimeConfig.googleClientId || '').trim(),
        atozasSsoEnabled: data?.atozasSsoEnabled === true || FALLBACK_ATOZAS_SSO_ENABLED,
        atozasAutoRedirect: data?.atozasAutoRedirect === true,
        atozasSilent: data?.atozasSilent === true,
      };
    } catch (_) {
      // Keep fallback values if runtime config is unavailable or too slow.
    } finally {
      clearTimeout(timer);
    }

    return runtimeConfig;
  })();

  return loadPromise;
};

// ── One login for every AtoZ app (ATOZAS) ─────────────────────────────────────
// Logout here: no silent sign-in on this device (all tabs) until a login button is pressed.
const ATOZAS_OPTOUT_KEY = 'atozas.optout.v1';
const ATOZAS_SILENT_KEY = 'atozas.silentcheck.v1';

export function markAtozasOptOut() {
  try { localStorage.setItem(ATOZAS_OPTOUT_KEY, '1'); } catch (_) { /* ignore */ }
}

export function clearAtozasOptOut() {
  try { localStorage.removeItem(ATOZAS_OPTOUT_KEY); } catch (_) { /* ignore */ }
}

/** method = the login button pressed here ('google' | 'otp' | 'atozas'); ATOZAS opens that login. */
export function startAtozasLogin(method = 'atozas', loginHint = '', returnTo = '/home') {
  clearAtozasOptOut();
  const params = new URLSearchParams({ returnTo, t: String(Date.now()) });
  if (method) params.set('method', method);
  if (loginHint) params.set('login_hint', loginHint);
  window.location.assign(`/api/auth/atozas?${params.toString()}`);
}

/**
 * Silent check: someone already signed in at ATOZAS (homepage or another AtoZ app) comes back
 * signed in here with no click (prompt=none); anyone else stays a guest. Once per tab, at most every
 * 5 minutes across tabs, never after Logout here until a login button is pressed.
 * Returns true if it redirected.
 */
export function maybeAtozasSilentCheck(status) {
  if (!status?.silent || status?.token || window.self !== window.top) return false;
  try {
    if (localStorage.getItem(ATOZAS_OPTOUT_KEY) === '1') return false;
    if (Number(sessionStorage.getItem(ATOZAS_SILENT_KEY) || 0) > 0) return false;
    if (Date.now() - Number(localStorage.getItem(ATOZAS_SILENT_KEY) || 0) < 5 * 60 * 1000) return false;
    if (new URLSearchParams(window.location.search).get('sso_error')) return false;
    if (/bot|crawl|spider|preview/i.test(navigator.userAgent || '')) return false;
    sessionStorage.setItem(ATOZAS_SILENT_KEY, String(Date.now()));
    localStorage.setItem(ATOZAS_SILENT_KEY, String(Date.now()));
  } catch (_) {
    return false;
  }
  const next = `${window.location.pathname}${window.location.search}` || '/';
  window.location.replace(`/api/auth/atozas/silent?returnTo=${encodeURIComponent(next)}`);
  return true;
}
