const FALLBACK_API_URL = String(process.env.REACT_APP_API_URL || '/api/v1').trim();
const FALLBACK_GOOGLE_CLIENT_ID = String(process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();

const normalizeApiUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return '/api/v1';
  return url.replace(/\/+$/, '');
};

const APP_CONFIG_ENDPOINT = `${normalizeApiUrl(FALLBACK_API_URL)}/app-config`;

let runtimeConfig = {
  apiUrl: normalizeApiUrl(FALLBACK_API_URL),
  googleClientId: FALLBACK_GOOGLE_CLIENT_ID,
};

let loadPromise = null;

export const getRuntimeConfig = () => runtimeConfig;

export const loadRuntimeConfig = async () => {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const response = await fetch(APP_CONFIG_ENDPOINT, {
        method: 'GET',
        cache: 'no-store',
      });
      if (!response.ok) return runtimeConfig;

      const data = await response.json();
      runtimeConfig = {
        apiUrl: normalizeApiUrl(data?.apiUrl || runtimeConfig.apiUrl),
        googleClientId: String(data?.googleClientId || runtimeConfig.googleClientId || '').trim(),
      };
    } catch (_) {
      // Keep fallback values if runtime config is unavailable.
    }

    return runtimeConfig;
  })();

  return loadPromise;
};
