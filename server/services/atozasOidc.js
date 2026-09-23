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

const ENDPOINT_NAME_RE = /\/(authorize|token|userinfo|revoke)(?:\.php)?\/?$/i;
const LIVE_IDP_BASE = 'https://atozasindia.in/sso';
const TEST_IDP_BASE = 'https://testatozas.in/atozaswebsite/sso';

const hostnameOf = (value) => {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '');
  } catch (_) {
    return '';
  }
};

const isSelfHostedIdpUrl = (value) => {
  const host = hostnameOf(value);
  if (!host) return false;
  if (host === 'ucasaapp.com') return true;
  if (host === 'casai.testatozas.in') return true;
  if (host === 'localhost' || host === '127.0.0.1') return true;
  return false;
};

const isTrustedIdpUrl = (value) => {
  const host = hostnameOf(value);
  return host === 'atozasindia.in' || host === 'testatozas.in';
};

const idpBaseForUrl = (value) => {
  const host = hostnameOf(value);
  if (host === 'testatozas.in') return TEST_IDP_BASE;
  if (host === 'atozasindia.in') return LIVE_IDP_BASE;
  if (host === 'casai.testatozas.in') return TEST_IDP_BASE;
  if (host === 'ucasaapp.com') return LIVE_IDP_BASE;
  return '';
};

const canonicalIdpBase = () => {
  const candidates = [
    config.atozas.issuer,
    config.atozas.authorizeUrl,
    config.atozas.tokenUrl,
    config.atozas.userinfoUrl,
  ];
  for (const candidate of candidates) {
    const base = idpBaseForUrl(candidate);
    if (base && isTrustedIdpUrl(candidate)) return base;
  }
  for (const candidate of candidates) {
    const base = idpBaseForUrl(candidate);
    if (base) return base;
  }
  if (config.server.isProduction) return LIVE_IDP_BASE;
  return TEST_IDP_BASE;
};

const ssoSiblingUrl = (endpointUrl, name) => {
  try {
    const parsed = new URL(endpointUrl);
    const basePath = parsed.pathname.replace(ENDPOINT_NAME_RE, '') || '/sso';
    const usePhp = /\.php$/i.test(parsed.pathname);
    return `${parsed.origin}${basePath}/${name}${usePhp ? '.php' : ''}`;
  } catch (_) {
    return '';
  }
};

const phpVariants = (url) => {
  const value = String(url || '').trim();
  if (!value) return [];
  try {
    const parsed = new URL(value);
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    const variants = new Set([value.replace(/\/+$/, '')]);
    if (/\.php$/i.test(path)) {
      parsed.pathname = path.replace(/\.php$/i, '');
      variants.add(parsed.toString().replace(/\/+$/, ''));
    } else if (ENDPOINT_NAME_RE.test(path)) {
      parsed.pathname = `${path}.php`;
      variants.add(parsed.toString().replace(/\/+$/, ''));
    }
    return [...variants];
  } catch (_) {
    return [value];
  }
};

const pickTrustedUrl = (urls, fallback) => {
  const list = urls.map((item) => String(item || '').trim()).filter(Boolean);
  const trusted = list.find((item) => isTrustedIdpUrl(item) && !isSelfHostedIdpUrl(item));
  if (trusted) return trusted;
  const notSelf = list.find((item) => !isSelfHostedIdpUrl(item));
  if (notSelf) return notSelf;
  return fallback || '';
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
  const idpBase = canonicalIdpBase();
  const discovered = {};
  const discoveryIssuer = isTrustedIdpUrl(atozas.issuer) ? atozas.issuer : idpBase;
  const needsDiscovery = !atozas.authorizeUrl || !atozas.tokenUrl || !atozas.userinfoUrl
    || isSelfHostedIdpUrl(atozas.authorizeUrl)
    || isSelfHostedIdpUrl(atozas.tokenUrl)
    || isSelfHostedIdpUrl(atozas.userinfoUrl);

  if (needsDiscovery && discoveryIssuer) {
    for (const url of discoveryUrlsForIssuer(discoveryIssuer)) {
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

  const authorize = pickTrustedUrl([
    atozas.authorizeUrl,
    discovered.authorization_endpoint,
    `${idpBase}/authorize.php`,
    `${idpBase}/authorize`,
  ], `${idpBase}/authorize.php`);

  const token = pickTrustedUrl([
    atozas.tokenUrl,
    discovered.token_endpoint,
    ssoSiblingUrl(authorize, 'token'),
    `${idpBase}/token.php`,
    `${idpBase}/token`,
  ], `${idpBase}/token.php`);

  const userinfo = pickTrustedUrl([
    atozas.userinfoUrl,
    discovered.userinfo_endpoint,
    ssoSiblingUrl(authorize, 'userinfo'),
    `${idpBase}/userinfo.php`,
    `${idpBase}/userinfo`,
  ], `${idpBase}/userinfo.php`);

  const revoke = pickTrustedUrl([
    atozas.revokeUrl,
    discovered.revocation_endpoint,
    ssoSiblingUrl(authorize, 'revoke'),
    `${idpBase}/revoke.php`,
    `${idpBase}/revoke`,
  ], '');

  if (
    isSelfHostedIdpUrl(atozas.authorizeUrl)
    || isSelfHostedIdpUrl(atozas.tokenUrl)
    || isSelfHostedIdpUrl(atozas.issuer)
  ) {
    logger.warn('ATOZAS IdP URLs pointed at this app; using canonical SSO issuer', {
      issuer: idpBase,
    });
  }

  const endpoints = { authorize, token, userinfo, revoke, idpBase };
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

const applyClientAuth = (headers, body, authStyle) => {
  const { clientId, clientSecret } = config.atozas;
  const style = String(authStyle || config.atozas.tokenAuthStyle || 'body').trim().toLowerCase();
  if (style === 'basic') {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
    return;
  }
  body.set('client_id', clientId);
  if (clientSecret) {
    body.set('client_secret', clientSecret);
  }
};

const readAccessToken = (body) => {
  if (!body || typeof body !== 'object') return '';
  return String(
    body.access_token
    || body.accessToken
    || body.token
    || ''
  ).trim();
};

const isUsableJsonTokenResponse = (result) => Boolean(result?.body && typeof result.body === 'object');

const postTokenRequest = async ({ tokenUrl, code, verifier, redirectUri, authStyle }) => {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });
  if (verifier) {
    body.set('code_verifier', verifier);
  }
  applyClientAuth(headers, body, authStyle);

  return fetchJson(tokenUrl, {
    method: 'POST',
    headers,
    body: body.toString(),
  });
};

const publicCallbackUri = (req) => {
  const configured = String(config.atozas.redirectUri || '').trim();
  const xfHost = String(req?.get?.('x-forwarded-host') || '').split(',')[0].trim();
  const host = xfHost || String(req?.get?.('host') || '').split(',')[0].trim();
  const proto = (String(req?.get?.('x-forwarded-proto') || '').split(',')[0].trim()
    || (req?.secure ? 'https' : 'http'));
  if (!host) return configured;

  const derived = `${proto}://${host.replace(/\/+$/, '')}/auth/atozas/callback`;
  if (!configured) return derived;

  const configuredHost = hostnameOf(configured);
  const requestHost = host.split(':')[0].toLowerCase().replace(/^www\./, '');
  if (configuredHost && requestHost && configuredHost === requestHost) {
    return configured;
  }
  return derived;
};

const exchangeCode = async ({ code, verifier, redirectUri, req }) => {
  const endpoints = await discoverEndpoints();
  const tokenUrls = [...new Set([
    endpoints.token,
    ...phpVariants(endpoints.token),
    `${endpoints.idpBase || canonicalIdpBase()}/token.php`,
    `${endpoints.idpBase || canonicalIdpBase()}/token`,
  ].filter((url) => url && !isSelfHostedIdpUrl(url)))];

  if (!tokenUrls.length) {
    throw new Error('ATOZAS token endpoint is not configured');
  }

  const redirect = String(redirectUri || publicCallbackUri(req) || config.atozas.redirectUri || '').trim();
  const authStyles = [...new Set([
    config.atozas.tokenAuthStyle || 'body',
    'body',
    'basic',
  ])];

  let lastStatus = 0;
  let lastError = '';
  let lastHint = '';

  for (const tokenUrl of tokenUrls) {
    for (const authStyle of authStyles) {
      const result = await postTokenRequest({
        tokenUrl,
        code,
        verifier,
        redirectUri: redirect,
        authStyle,
      });
      lastStatus = result.status;
      lastError = result.body?.error || '';
      lastHint = result.body?.error_description || '';

      const accessToken = readAccessToken(result.body);
      if (result.ok && accessToken) {
        return {
          accessToken,
          refreshToken: String(result.body.refresh_token || result.body.refreshToken || ''),
          idToken: String(result.body.id_token || result.body.idToken || ''),
          tokenType: result.body.token_type || 'Bearer',
          expiresIn: result.body.expires_in,
        };
      }

      if (!isUsableJsonTokenResponse(result)) {
        break;
      }
      if (result.body?.error === 'invalid_client') {
        continue;
      }
      if (result.body?.error === 'invalid_grant') {
        logger.warn('ATOZAS token exchange failed', {
          status: result.status,
          error: result.body?.error || '',
          hint: result.body?.error_description || '',
        });
        throw new Error('ATOZAS token exchange failed');
      }
      break;
    }
  }

  logger.warn('ATOZAS token exchange failed', {
    status: lastStatus,
    error: lastError,
    hint: lastHint,
  });
  throw new Error('ATOZAS token exchange failed');
};

const fetchUserInfo = async (accessToken) => {
  const endpoints = await discoverEndpoints();
  const userinfoUrls = [...new Set([
    endpoints.userinfo,
    ...phpVariants(endpoints.userinfo),
    `${endpoints.idpBase || canonicalIdpBase()}/userinfo.php`,
    `${endpoints.idpBase || canonicalIdpBase()}/userinfo`,
  ].filter((url) => url && !isSelfHostedIdpUrl(url)))];

  if (!userinfoUrls.length) {
    throw new Error('ATOZAS userinfo endpoint is not configured');
  }

  let lastStatus = 0;
  for (const userinfoUrl of userinfoUrls) {
    const result = await fetchJson(userinfoUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    lastStatus = result.status;
    if (result.ok && result.body && typeof result.body === 'object' && !Array.isArray(result.body)) {
      return result.body;
    }
    if (result.body && typeof result.body === 'object') {
      break;
    }
  }

  logger.warn('ATOZAS userinfo request failed', { status: lastStatus });
  throw new Error('ATOZAS userinfo request failed');
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
  publicCallbackUri,
  isSelfHostedIdpUrl,
  canonicalIdpBase,
};
