const crypto = require('crypto');
const User = require('../models/User');
const DriverScore = require('../models/DriverScore');
const AtozasOidcFlow = require('../models/AtozasOidcFlow');
const config = require('../config');
const { signToken } = require('./authController');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../middleware/logger');
const { isDBConnected } = require('../config/database');
const { saveSession, destroySession } = require('../middleware/atozasSession');
const {
  generatePkceS256,
  generateNonce,
  encodeSignedState,
  decodeSignedState,
  unwrapProviderState,
  sanitizeReturnTo,
  buildAuthorizeUrl,
  exchangeCode,
  fetchUserInfo,
  revokeToken,
  isConfigured,
} = require('../services/atozasOidc');

const OIDC_FLOW_TTL_MS = 10 * 60 * 1000;
const FLOW_COOKIE = 'cas_atozas_flow';
const FLOW_COOKIE_CS = 'cas_atozas_flow_cs';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const deriveNameFromProfile = (profile, email) => {
  const fullName = String(profile?.name || '').trim();
  if (fullName.length >= 2) return fullName.slice(0, 100);

  const combined = [profile?.given_name, profile?.family_name].filter(Boolean).join(' ').trim();
  if (combined.length >= 2) return combined.slice(0, 100);

  const preferred = String(profile?.preferred_username || '').trim();
  if (preferred.length >= 2 && !preferred.includes('@')) return preferred.slice(0, 100);

  const local = String(email || '').split('@')[0] || '';
  const cleaned = local.replace(/[._-]+/g, ' ').trim();
  if (cleaned.length >= 2) {
    return cleaned
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
      .slice(0, 100);
  }
  return 'CAS User';
};

const requireSsoReady = (next) => {
  if (!config.atozas.enabled) {
    next(new AppError('ATOZAS SSO is disabled', 404));
    return false;
  }
  if (!isConfigured()) {
    next(new AppError('ATOZAS SSO is not configured', 503));
    return false;
  }
  if (!isDBConnected()) {
    next(new AppError('Service is starting. Please retry shortly.', 503));
    return false;
  }
  return true;
};

const redirectWithError = (res, returnTo, code) => {
  const target = sanitizeReturnTo(returnTo, '/login');
  const separator = target.includes('?') ? '&' : '?';
  const loginFallback = target.startsWith('/login') ? target : '/login';
  res.redirect(`${loginFallback}${separator}sso_error=${encodeURIComponent(code || 'login_failed')}`);
};

const upsertAtozasUser = async (profile) => {
  const email = normalizeEmail(profile?.email);
  if (!email) {
    throw new AppError('ATOZAS account email is required', 401);
  }

  const now = new Date();
  let user = await User.findOneAndUpdate(
    { email },
    { $set: { lastLogin: now } },
    { new: true }
  );

  if (user) {
    return { user, created: false };
  }

  try {
    user = await User.create({
      name: deriveNameFromProfile(profile, email),
      email,
      password: crypto.randomBytes(24).toString('hex'),
      phone: String(profile?.phone_number || '').trim(),
    });
  } catch (err) {
    if (err && err.code === 11000) {
      user = await User.findOneAndUpdate(
        { email },
        { $set: { lastLogin: now } },
        { new: true }
      );
      if (user) return { user, created: false };
    }
    throw err;
  }

  DriverScore.create({ userId: user._id }).catch((scoreErr) => {
    logger.warn('DriverScore create failed after ATOZAS signup', {
      err: scoreErr.message,
      userId: String(user._id),
    });
  });

  return { user, created: true };
};

const issueAppJwt = (user) => signToken(user._id);

const readCookie = (req, name) => {
  const header = String(req.headers.cookie || '');
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) === name) {
      try {
        return decodeURIComponent(trimmed.slice(eq + 1));
      } catch (_) {
        return trimmed.slice(eq + 1);
      }
    }
  }
  return '';
};

const isHttpsRequest = (req) =>
  req.secure === true
  || String(req.get('x-forwarded-proto') || '').split(',')[0].trim() === 'https';

const setNoStore = (res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('CDN-Cache-Control', 'no-store');
  res.set('Surrogate-Control', 'no-store');
};

const flowCookieOptions = (req, sameSite) => {
  const secure = isHttpsRequest(req);
  return {
    httpOnly: true,
    path: '/',
    maxAge: OIDC_FLOW_TTL_MS,
    sameSite,
    secure: sameSite === 'none' ? true : secure,
  };
};

const setFlowCookies = (req, res, state) => {
  res.cookie(FLOW_COOKIE, state, flowCookieOptions(req, 'lax'));
  if (isHttpsRequest(req)) {
    res.cookie(FLOW_COOKIE_CS, state, flowCookieOptions(req, 'none'));
  }
};

const clearFlowCookie = (req, res) => {
  const secure = isHttpsRequest(req);
  res.clearCookie(FLOW_COOKIE, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure,
  });
  res.clearCookie(FLOW_COOKIE_CS, {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
  });
};

const loadOidcFlow = async ({ keys = [], sessionFlow }) => {
  const uniqueKeys = [...new Set(keys.filter(Boolean))];
  for (const key of uniqueKeys) {
    const stored = await AtozasOidcFlow.findOne({ _id: key });
    if (stored) {
      return {
        state: stored._id,
        nonce: stored.nonce,
        verifier: stored.verifier,
        returnTo: stored.returnTo,
        createdAt: stored.createdAt ? stored.createdAt.getTime() : Date.now(),
      };
    }
  }
  if (sessionFlow?.verifier && sessionFlow?.state) {
    return sessionFlow;
  }
  return null;
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const interstitialHtml = (url) => {
  const safe = escapeHtml(url);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
  <meta http-equiv="refresh" content="0;url=${safe}">
  <title>Continue to ATOZAS</title>
</head>
<body>
  <script>window.location.replace(${JSON.stringify(url)});</script>
  <p>Redirecting to ATOZAS…</p>
</body>
</html>`;
};

const callbackParam = (req, name) => {
  const queryValue = req.query?.[name];
  const bodyValue = req.body?.[name];
  return String(queryValue || bodyValue || '').trim();
};

const readAuthCode = (req) =>
  callbackParam(req, 'code')
  || callbackParam(req, 'authorization_code')
  || callbackParam(req, 'auth_code')
  || callbackParam(req, 'sso_code');

const callbackForwardHtml = () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Cache-Control" content="no-store">
  <title>Completing ATOZAS sign-in</title>
</head>
<body>
  <script>
  (function () {
    var search = window.location.search || '';
    var hash = (window.location.hash || '').replace(/^#/, '');
    var params = search;
    if (!params && hash) params = '?' + hash;
    if (!params || params === '?' || !(/(?:^|[?&])(code|authorization_code|auth_code|sso_code|error|state)=/.test(params))) {
      window.location.replace('/login?sso_error=invalid_state');
      return;
    }
    var next = '/api/auth/atozas/callback' + params;
    next += (params.indexOf('?') === 0 ? '&' : '?') + '_fwd=1';
    window.location.replace(next);
  })();
  </script>
  <p>Completing ATOZAS sign-in…</p>
</body>
</html>`;

exports.startAtozasLogin = asyncHandler(async (req, res, next) => {
  if (!requireSsoReady(next)) return;

  const returnTo = sanitizeReturnTo(req.query.returnTo, '/home');
  const nonce = generateNonce();
  const pkce = generatePkceS256();
  const state = encodeSignedState(pkce.verifier);
  const flow = {
    state,
    nonce,
    verifier: pkce.verifier,
    returnTo,
    createdAt: Date.now(),
  };

  await AtozasOidcFlow.create({
    _id: state,
    nonce,
    verifier: pkce.verifier,
    returnTo,
  });

  if (req.session) {
    req.session.atozasOidc = flow;
    await saveSession(req);
  }

  const authorizeUrl = await buildAuthorizeUrl({
    state,
    challenge: pkce.challenge,
    nonce,
  });

  logger.info('ATOZAS login started');
  setNoStore(res);
  setFlowCookies(req, res, state);
  res.status(200).type('html').send(interstitialHtml(authorizeUrl));
});

exports.handleAtozasCallback = asyncHandler(async (req, res) => {
  setNoStore(res);
  const earlyCode = readAuthCode(req);
  const earlyError = callbackParam(req, 'error');
  if (req.method === 'GET' && !earlyCode && !earlyError && req.query._fwd !== '1') {
    return res.status(200).type('html').send(callbackForwardHtml());
  }

  const rawQueryState = callbackParam(req, 'state')
    || callbackParam(req, 'session_state')
    || callbackParam(req, 'sso_state');
  const stateCandidates = unwrapProviderState(rawQueryState);
  const cookieState = readCookie(req, FLOW_COOKIE) || readCookie(req, FLOW_COOKIE_CS);
  const sessionState = req.session?.atozasOidc?.state || '';

  const fail = async (code, reason) => {
    logger.warn('ATOZAS callback failed', {
      reason: reason || code,
      hasQueryState: Boolean(rawQueryState),
      hasCookieState: Boolean(cookieState),
      hasSessionState: Boolean(sessionState),
      queryKeys: Object.keys(req.query || {}),
    });
    if (req.session) delete req.session.atozasOidc;
    await saveSession(req).catch(() => {});
    clearFlowCookie(req, res);
    redirectWithError(res, '/login', code);
  };

  if (!config.atozas.enabled || !isConfigured()) {
    return fail('disabled');
  }
  if (!isDBConnected()) {
    return fail('unavailable');
  }
  if (callbackParam(req, 'error')) {
    return fail('provider_error', String(callbackParam(req, 'error')));
  }

  let pending = null;
  for (const candidate of stateCandidates) {
    pending = decodeSignedState(candidate);
    if (pending) break;
  }
  if (!pending) {
    pending = decodeSignedState(cookieState) || decodeSignedState(sessionState);
  }
  if (!pending) {
    pending = await loadOidcFlow({
      keys: [...stateCandidates, cookieState, sessionState],
      sessionFlow: req.session?.atozasOidc,
    });
  }

  const returnTo = sanitizeReturnTo(pending?.returnTo || req.session?.atozasOidc?.returnTo, '/home');
  const code = readAuthCode(req);
  if (!code) {
    return fail(pending ? 'missing_code' : 'invalid_state', 'missing_code_or_flow');
  }

  let tokens;
  try {
    tokens = await exchangeCode({
      code,
      verifier: pending?.verifier,
    });
  } catch (_) {
    if (pending?.verifier) {
      try {
        tokens = await exchangeCode({ code });
      } catch (__) {
        return fail('token_exchange');
      }
    } else {
      return fail('token_exchange');
    }
  }

  let profile;
  try {
    profile = await fetchUserInfo(tokens.accessToken);
  } catch (_) {
    return fail('userinfo');
  }

  if (!normalizeEmail(profile.email)) {
    return fail('email_required');
  }

  let result;
  try {
    result = await upsertAtozasUser(profile);
  } catch (err) {
    logger.warn('ATOZAS user upsert failed', { reason: err.message });
    return fail('user_sync');
  }

  try {
    if (req.session) {
      delete req.session.atozasOidc;
      req.session.atozas = {
        userId: String(result.user._id),
        email: result.user.email,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          idToken: tokens.idToken,
        },
      };
      await saveSession(req);
    }
    if (pending?.state) {
      await AtozasOidcFlow.deleteOne({ _id: pending.state }).catch(() => {});
    }
    clearFlowCookie(req, res);
  } catch (err) {
    logger.warn('ATOZAS session finalize failed', { reason: err.message });
  }

  logger.info('ATOZAS login completed', {
    userId: String(result.user._id),
    created: result.created,
  });
  res.redirect(returnTo);
});

exports.getAtozasMe = asyncHandler(async (req, res, next) => {
  if (!requireSsoReady(next)) return;

  const userId = req.session?.atozas?.userId;
  if (!userId) {
    return res.json({ success: true, authenticated: false });
  }

  const user = await User.findById(userId);
  if (!user || user.isActive === false) {
    if (req.session) delete req.session.atozas;
    await saveSession(req).catch(() => {});
    return next(new AppError('ATOZAS session is no longer valid', 401));
  }

  res.json({
    success: true,
    token: issueAppJwt(user),
    user: user.toSafeObject(),
  });
});

exports.logoutAtozas = asyncHandler(async (req, res) => {
  const tokens = req.session?.atozas?.tokens || {};
  if (config.atozas.enabled) {
    await Promise.allSettled([
      revokeToken(tokens.accessToken, 'access_token'),
      revokeToken(tokens.refreshToken, 'refresh_token'),
    ]);
  }

  await destroySession(req, res);
  res.json({ success: true });
});

exports.upsertAtozasUser = upsertAtozasUser;
exports.issueAppJwt = issueAppJwt;
