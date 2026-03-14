const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const parseCsv = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const parseOrigins = parseCsv;
const localDevOrigins = ['http://localhost:3000', 'http://localhost:3001'];
const configuredOrigins = parseOrigins(process.env.CORS_ORIGINS || process.env.CLIENT_URL);
const allowedOrigins = Array.from(
  new Set(
    process.env.NODE_ENV === 'development'
      ? [...configuredOrigins, ...localDevOrigins]
      : configuredOrigins
  )
);
const googleClientIds = Array.from(
  new Set(parseCsv(process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID))
);

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
    maxRetries: 10,
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
    proximityAlertMeters: parseFloat(process.env.PROXIMITY_ALERT_METERS) || 1,
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

  cors: {
    allowedOrigins,
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
