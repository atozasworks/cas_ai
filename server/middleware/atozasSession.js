const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const config = require('../config');
const logger = require('./logger');

const isAtozasSsoEnabled = () => config.atozas.enabled === true;

const sessionMaxAgeMs = () =>
  Math.max(1, config.atozas.sessionMaxAgeDays) * 24 * 60 * 60 * 1000;

let sessionMiddleware = null;

const getAtozasSessionMiddleware = () => {
  if (sessionMiddleware) return sessionMiddleware;
  if (!isAtozasSsoEnabled()) return null;
  if (!config.atozas.sessionSecret) {
    logger.warn('ATOZAS SSO is enabled but ATOZAS_SESSION_SECRET is missing');
    return null;
  }

  sessionMiddleware = session({
    name: config.atozas.sessionCookieName,
    secret: config.atozas.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: true,
    store: MongoStore.create({
      mongoUrl: config.mongodb.uri,
      collectionName: config.atozas.sessionCollection,
      ttl: Math.floor(sessionMaxAgeMs() / 1000),
    }),
    cookie: {
      httpOnly: true,
      // 'auto' uses HTTPS when trust proxy / X-Forwarded-Proto say so.
      secure: config.atozas.cookieSecure === true ? true : 'auto',
      sameSite: config.atozas.cookieSameSite,
      maxAge: sessionMaxAgeMs(),
      path: '/',
    },
  });

  return sessionMiddleware;
};

const ATOZAS_ROUTE_PREFIXES = ['/auth', '/api/auth'];

const attachAtozasSession = (app) => {
  const middleware = getAtozasSessionMiddleware();
  if (!middleware) return false;
  ATOZAS_ROUTE_PREFIXES.forEach((prefix) => app.use(prefix, middleware));
  return true;
};

const saveSession = (req) => new Promise((resolve, reject) => {
  if (!req.session) return resolve();
  req.session.save((err) => (err ? reject(err) : resolve()));
});

const destroySession = (req, res) => new Promise((resolve) => {
  const cookieName = config.atozas.sessionCookieName;
  const clearCookie = () => {
    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: config.atozas.cookieSecure,
      sameSite: config.atozas.cookieSameSite,
      path: '/',
    });
  };

  if (!req.session) {
    clearCookie();
    return resolve();
  }

  req.session.destroy(() => {
    clearCookie();
    resolve();
  });
});

module.exports = {
  isAtozasSsoEnabled,
  ATOZAS_ROUTE_PREFIXES,
  attachAtozasSession,
  getAtozasSessionMiddleware,
  saveSession,
  destroySession,
};
