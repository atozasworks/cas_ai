const FALLBACK_API_URL = String(process.env.REACT_APP_API_URL || '/api/v1').trim();
const FALLBACK_GOOGLE_CLIENT_ID = String(process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
const FALLBACK_GOOGLE_MAPS_API_KEY = String(process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '').trim();
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
  googleMapsApiKey: FALLBACK_GOOGLE_MAPS_API_KEY,
  atozasSsoEnabled: FALLBACK_ATOZAS_SSO_ENABLED,
  atozasAutoRedirect: false,
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
      if (!response.ok) {
        loadPromise = null;
        return runtimeConfig;
      }

      const data = await response.json();
      runtimeConfig = {
        apiUrl: normalizeApiUrl(data?.apiUrl || runtimeConfig.apiUrl),
        googleClientId: String(data?.googleClientId || runtimeConfig.googleClientId || '').trim(),
        googleMapsApiKey: String(data?.googleMapsApiKey || runtimeConfig.googleMapsApiKey || '').trim(),
        atozasSsoEnabled: data?.atozasSsoEnabled === true || FALLBACK_ATOZAS_SSO_ENABLED,
        atozasAutoRedirect: data?.atozasAutoRedirect === true,
      };
    } catch (_) {
      loadPromise = null;
    }

    return runtimeConfig;
  })();

  return loadPromise;
};
