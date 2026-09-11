const crypto = require('crypto');
const config = require('../config');
const logger = require('../middleware/logger');

const DISCOVERY_TTL_MS = 10 * 60 * 1000;
let cachedEndpoints = null;
let cachedEndpointsAt = 0;

const generatePkceS256 = () => {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge, method: 'S256' };
};

// ATOZAS only accepts hex state values (32–128 chars).
const generateState = () => crypto.randomBytes(32).toString('hex');

const generateNonce = () => crypto.randomBytes(16).toString('hex');

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  if (!a.length || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

const SIGNED_STATE_TTL_SEC = 10 * 60;

const encodeSignedState = (verifier) => {
  const verifierBytes = Buffer.from(String(verifier), 'base64url');
  if (verifierBytes.length !== 32) {
    throw new Error('Invalid PKCE verifier');
  }
  const header = Buffer.alloc(4);
  header.writeUInt32BE(Math.floor(Date.now() / 1000), 0);
  const payload = Buffer.concat([header, verifierBytes]);
  const mac = crypto.createHmac('sha256', config.atozas.sessionSecret).update(payload).digest().subarray(0, 16);
  return Buffer.concat([payload, mac]).toString('hex');
};

const decodeSignedState = (state) => {
  const raw = String(state || '').trim().toLowerCase();
  if (!/^[0-9a-f]{104}$/.test(raw)) return null;
  const buf = Buffer.from(raw, 'hex');
  const payload = buf.subarray(0, 36);
  const mac = buf.subarray(36);
  const expected = crypto.createHmac('sha256', config.atozas.sessionSecret).update(payload).digest().subarray(0, 16);
  if (!safeEqual(mac.toString('hex'), expected.toString('hex'))) return null;
  const createdAtSec = payload.readUInt32BE(0);
  if (Math.floor(Date.now() / 1000) - createdAtSec > SIGNED_STATE_TTL_SEC) return null;
  return {
    state: raw,
    verifier: payload.subarray(4).toString('base64url'),
    createdAt: createdAtSec * 1000,
  };
};

const unwrapProviderState = (raw) => {
  const value = String(raw || '').trim();
  const values = [];
  if (value) values.push(value);
  const dot = value.indexOf('.');
  if (dot > 16) {
    const encodings = ['base64', 'base64url'];
    for (const encoding of encodings) {
      try {
        const parsed = JSON.parse(Buffer.from(value.slice(0, dot), encoding).toString('utf8'));
        if (parsed && parsed.state) values.push(String(parsed.state));
        if (parsed && parsed.code_verifier) values.push(String(parsed.code_verifier));
      } catch (_) {
        // Not an ATOZAS pending-state wrapper.
      }
    }
  }
  return [...new Set(values.filter(Boolean))];
};

const isSafeRelativePath = (value) => {
  if (typeof value !== 'string') return false;
  let candidate = value.trim();
  if (!candidate) return false;
  try {
    candidate = decodeURIComponent(candidate);
  } catch (_) {
    // Keep the original string if it is not URI-encoded.
  }
  candidate = candidate.split('#')[0];
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return false;
  if (candidate.includes('\\') || candidate.includes('://') || candidate.includes('@')) return false;
  if (/[\u0000-\u001F\u007F]/.test(candidate)) return false;
  return true;
};

const sanitizeReturnTo = (value, fallback = '/home') => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return isSafeRelativePath(raw) ? raw.split('#')[0] : fallback;
};

const discoveryUrlsForIssuer = (issuer) => {
  const urls = [];
  if (!issuer) return urls;
  urls.push(`${issuer}/.well-known/openid-configuration`);
  urls.push(`${issuer}/sso`);
  urls.push(`${issuer}/sso/`);
  try {
    const parsed = new URL(issuer);
    const origin = parsed.origin;
    if (`${origin}${parsed.pathname}`.replace(/\/+$/, '') !== issuer) {
      urls.push(`${origin}/.well-known/openid-configuration`);
    }
    urls.push(`${origin}${parsed.pathname}/.well-known/openid-configuration`.replace(/\/{2,}/g, '/').replace(':/', '://'));
    urls.push(`${origin}/sso`);
    urls.push(`${origin}/sso/`);
  } catch (_) {
    // Issuer is not a valid URL; skip origin-based discovery.
  }
  return [...new Set(urls)];
};

const ssoSiblingUrl = (endpointUrl, name) => {
  try {
    const parsed = new URL(endpointUrl);
    const basePath = parsed.pathname.replace(/\/(?:authorize|token|userinfo|revoke)\/?$/i, '');
    return `${parsed.origin}${basePath}/${name}`;
  } catch (_) {
    return '';
  }
};

const sameEndpointHost = (left, right) => {
  try {
    return new URL(left).host === new URL(right).host;
  } catch (_) {
    return false;
  }
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (_) {
    body = null;
  }
  return { ok: response.ok, status: response.status, body, text };
};

const discoverEndpoints = async () => {
  const now = Date.now();
  if (cachedEndpoints && (now - cachedEndpointsAt) < DISCOVERY_TTL_MS) {
    return cachedEndpoints;
  }

  const atozas = config.atozas;
  const discovered = {};
  const tokenHostMismatch = Boolean(
    atozas.authorizeUrl
    && atozas.tokenUrl
    && !sameEndpointHost(atozas.authorizeUrl, atozas.tokenUrl)
  );

  const needsDiscovery = !atozas.authorizeUrl || !atozas.tokenUrl || !atozas.userinfoUrl || tokenHostMismatch;
  if (needsDiscovery && atozas.issuer) {
    for (const url of discoveryUrlsForIssuer(atozas.issuer)) {
      try {
        const result = await fetchJson(url, { method: 'GET' });
        if (result.ok && result.body && typeof result.body === 'object') {
          discovered.authorization_endpoint = result.body.authorization_endpoint;
          discovered.token_endpoint = result.body.token_endpoint;
          discovered.userinfo_endpoint = result.body.userinfo_endpoint;
          discovered.revocation_endpoint = result.body.revocation_endpoint;
          logger.info('ATOZAS OIDC discovery succeeded');
          break;
        }
      } catch (err) {
        logger.warn('ATOZAS OIDC discovery request failed', { reason: err.message });
      }
    }
  }

  const issuer = atozas.issuer;
  const authorize = atozas.authorizeUrl
    || discovered.authorization_endpoint
    || (issuer ? `${issuer}/sso/authorize` : '');
  const tokenFromEnv = atozas.tokenUrl;
  const endpoints = {
    authorize,
    token: (!tokenHostMismatch && tokenFromEnv)
      || discovered.token_endpoint
      || ssoSiblingUrl(authorize, 'token')
      || (issuer ? `${issuer}/sso/token` : ''),
    userinfo: atozas.userinfoUrl
      || discovered.userinfo_endpoint
      || ssoSiblingUrl(authorize, 'userinfo')
      || (issuer ? `${issuer}/sso/userinfo` : ''),
    revoke: atozas.revokeUrl
      || discovered.revocation_endpoint
      || ssoSiblingUrl(authorize, 'revoke')
      || '',
  };

  cachedEndpoints = endpoints;
  cachedEndpointsAt = now;
  return endpoints;
};

const buildAuthorizeUrl = async ({ state, challenge, nonce }) => {
  const endpoints = await discoverEndpoints();
  if (!endpoints.authorize) {
    throw new Error('ATOZAS authorization endpoint is not configured');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.atozas.clientId,
    redirect_uri: config.atozas.redirectUri,
    scope: config.atozas.scope,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  if (config.atozas.homepageKey) {
    params.set('homepage_key', config.atozas.homepageKey);
  }

  return `${endpoints.authorize}?${params.toString()}`;
};

const applyClientAuth = (headers, body) => {
  const { clientId, clientSecret, tokenAuthStyle } = config.atozas;
  if (tokenAuthStyle === 'basic') {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
    return;
  }
  body.set('client_id', clientId);
  if (clientSecret) {
    body.set('client_secret', clientSecret);
  }
};

const exchangeCode = async ({ code, verifier }) => {
  const endpoints = await discoverEndpoints();
  if (!endpoints.token) {
    throw new Error('ATOZAS token endpoint is not configured');
  }

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.atozas.redirectUri,
  });
  if (verifier) {
    body.set('code_verifier', verifier);
  }
  applyClientAuth(headers, body);

  const result = await fetchJson(endpoints.token, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  if (!result.ok || !result.body?.access_token) {
    logger.warn('ATOZAS token exchange failed', {
      status: result.status,
      error: result.body?.error || '',
      hint: result.body?.error_description || '',
    });
    throw new Error('ATOZAS token exchange failed');
  }

  return {
    accessToken: result.body.access_token,
    refreshToken: result.body.refresh_token || '',
    idToken: result.body.id_token || '',
    tokenType: result.body.token_type || 'Bearer',
    expiresIn: result.body.expires_in,
  };
};

const fetchUserInfo = async (accessToken) => {
  const endpoints = await discoverEndpoints();
  if (!endpoints.userinfo) {
    throw new Error('ATOZAS userinfo endpoint is not configured');
  }

  const result = await fetchJson(endpoints.userinfo, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!result.ok || !result.body || typeof result.body !== 'object') {
    logger.warn('ATOZAS userinfo request failed', { status: result.status });
    throw new Error('ATOZAS userinfo request failed');
  }

  return result.body;
};

const revokeToken = async (token, hint) => {
  if (!token) return;
  const endpoints = await discoverEndpoints();
  if (!endpoints.revoke) return;

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  const body = new URLSearchParams({ token });
  if (hint) body.set('token_type_hint', hint);
  applyClientAuth(headers, body);

  try {
    const result = await fetchJson(endpoints.revoke, {
      method: 'POST',
      headers,
      body: body.toString(),
    });
    if (!result.ok) {
      logger.warn('ATOZAS token revoke failed', { status: result.status, hint: hint || 'none' });
    }
  } catch (err) {
    logger.warn('ATOZAS token revoke request failed', { reason: err.message });
  }
};

const isConfigured = () => Boolean(
  config.atozas.enabled
  && config.atozas.issuer
  && config.atozas.clientId
  && config.atozas.redirectUri
  && config.atozas.sessionSecret
);

module.exports = {
  generatePkceS256,
  generateState,
  generateNonce,
  encodeSignedState,
  decodeSignedState,
  unwrapProviderState,
  safeEqual,
  sanitizeReturnTo,
  isSafeRelativePath,
  discoverEndpoints,
  buildAuthorizeUrl,
  exchangeCode,
  fetchUserInfo,
  revokeToken,
  isConfigured,
};
