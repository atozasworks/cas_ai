const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const parseCsv = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const parseOrigins = parseCsv;
const normalizeOrigin = (origin) => {
  const raw = String(origin || '').trim();
  if (!raw) return '';
  const sanitized = raw.replace(/\/+$/, '');

  try {
    const parsed = new URL(sanitized);
    const protocol = parsed.protocol.toLowerCase();
    const host = parsed.hostname.toLowerCase().replace(/\.+$/, '');
    const isDefaultPort = (protocol === 'http:' && parsed.port === '80')
      || (protocol === 'https:' && parsed.port === '443');
    const port = parsed.port && !isDefaultPort ? `:${parsed.port}` : '';
    return `${protocol}//${host}${port}`;
  } catch (_) {
    return sanitized.toLowerCase().replace(/\.+$/, '');
  }
};
const isIpLikeHost = (host) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
const withWwwVariants = (origin) => {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return [];

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname;
    if (host === 'localhost' || isIpLikeHost(host)) return [normalized];

    const baseHost = host.startsWith('www.') ? host.slice(4) : host;
    const protocol = parsed.protocol;
    const port = parsed.port ? `:${parsed.port}` : '';
    return [
      `${protocol}//${baseHost}${port}`,
      `${protocol}//www.${baseHost}${port}`,
    ];
  } catch (_) {
    return [normalized];
  }
};
const localDevOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://localhost:7760',
  'http://127.0.0.1:7760',
];
const configuredOrigins = parseOrigins(process.env.CORS_ORIGINS || process.env.CLIENT_URL);
const allowedOrigins = Array.from(
  new Set(
    process.env.NODE_ENV === 'development'
      ? [...configuredOrigins, ...localDevOrigins]
      : configuredOrigins
  )
);
const normalizedAllowedOrigins = Array.from(new Set(
  allowedOrigins.flatMap((origin) => withWwwVariants(origin)).filter(Boolean)
));
const allowedOriginSet = new Set(normalizedAllowedOrigins);
const isOriginAllowed = (origin) => !origin || allowedOriginSet.has(normalizeOrigin(origin));
const googleClientIds = Array.from(
  new Set(parseCsv(process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID))
);
const publicApiUrl = process.env.PUBLIC_API_URL || process.env.REACT_APP_API_URL || '/api/v1';
const publicGoogleClientId =
  process.env.PUBLIC_GOOGLE_CLIENT_ID
  || process.env.REACT_APP_GOOGLE_CLIENT_ID
  || process.env.GOOGLE_CLIENT_ID
  || '';

const config = {
  server: {
    port: parseInt(process.env.PORT, 10) || 5000,
    env: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cas_db',
    options: {
      maxPoolSize: 50,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
    },
  },

  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryDelayMs: 3000,
    maxRetries: 3,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_in_prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'groq',
    openai: { apiKey: process.env.OPENAI_API_KEY },
    groq: { apiKey: process.env.GROQ_API_KEY },
    deepseek: { apiKey: process.env.DEEPSEEK_API_KEY },
  },

  risk: {
    proximityThresholdMeters: parseFloat(process.env.PROXIMITY_THRESHOLD_METERS) || 500,
    criticalDistanceMeters: parseFloat(process.env.CRITICAL_DISTANCE_METERS) || 20,
    /** Distance (m) at which to show popup + sound alert when another vehicle is nearby */
    proximityAlertMeters: parseFloat(process.env.PROXIMITY_ALERT_METERS) || 50,
    gpsUpdateIntervalMs: parseInt(process.env.GPS_UPDATE_INTERVAL_MS, 10) || 3000,
    weights: {
      proximity: parseFloat(process.env.WEIGHT_PROXIMITY) || 0.35,
      relativeSpeed: parseFloat(process.env.WEIGHT_RELATIVE_SPEED) || 0.30,
      directionAlignment: parseFloat(process.env.WEIGHT_DIRECTION_ALIGNMENT) || 0.20,
      acceleration: parseFloat(process.env.WEIGHT_ACCELERATION) || 0.15,
    },
  },

  socket: {
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL, 10) || 10000,
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT, 10) || 5000,
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientIds: googleClientIds,
  },

  publicClient: {
    apiUrl: String(publicApiUrl || '/api/v1').trim(),
    googleClientId: String(publicGoogleClientId || '').trim(),
  },

  cors: {
    allowedOrigins: normalizedAllowedOrigins,
    isOriginAllowed,
    normalizeOrigin,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
};

module.exports = config;
