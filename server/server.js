const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { connectDB, disconnectDB, isDBConnected } = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');
const { initializeSocket } = require('./sockets');
const routes = require('./routes');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

// ───────── Global Middleware ─────────

app.use(helmet({
  contentSecurityPolicy: false,
  // Required for Google Sign-In popup mode in modern browsers.
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));
app.use(compression());
app.use(cors({
  origin: (origin, callback) => {
    if (config.cors.isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (config.server.env === 'development') {
  app.use(morgan('dev'));
}

app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// ───────── API Routes ─────────

app.use('/api/v1', (req, res, next) => {
  if (req.path === '/health' || req.path === '/app-config') return next();
  if (!isDBConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Service is starting. Please retry shortly.',
    });
  }
  return next();
}, routes);

// ───────── Serve React Build ─────────
// CI uploads the GitHub-built client into server/build. That folder wins when
// index.html is present, so a frontend-only deploy is picked up without a restart.
// BUILD_PATH and the old Hostinger path remain fallbacks until the first upload.

const fs = require('fs');

function resolveBuildPath() {
  const candidates = [
    path.join(__dirname, 'build'),
    process.env.BUILD_PATH,
    '/home/ucasaapp/htdocs/ucasaapp.com/build',
    path.join(__dirname, '..', 'client', 'build'),
  ];
  const seen = new Set();

  for (const candidate of candidates) {
    if (!candidate) continue;
    const resolved = path.resolve(candidate);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (fs.existsSync(path.join(resolved, 'index.html'))) return resolved;
  }

  return null;
}

let activeBuildPath = null;
let staticMiddleware = (req, res, next) => next();
let buildCheckedAt = 0;

function refreshBuild() {
  const now = Date.now();
  if (activeBuildPath && now - buildCheckedAt < 2000) return;
  buildCheckedAt = now;

  const buildPath = resolveBuildPath();
  if (buildPath === activeBuildPath) return;

  activeBuildPath = buildPath;
  if (!buildPath) {
    staticMiddleware = (req, res, next) => next();
    logger.warn('No React build found. Checked server/build, BUILD_PATH, and client/build.');
    return;
  }

  staticMiddleware = express.static(buildPath, {
    etag: true,
    maxAge: '1h',
    setHeaders(res, filePath) {
      const base = path.basename(filePath);
      if (base === 'index.html' || base === 'service-worker.js') {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  });
  logger.info(`Serving React build from: ${buildPath}`);
}

refreshBuild();

app.use((req, res, next) => {
  refreshBuild();
  return staticMiddleware(req, res, next);
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  refreshBuild();
  if (!activeBuildPath) return next();
  res.setHeader('Cache-Control', 'no-cache');
  return res.sendFile(path.join(activeBuildPath, 'index.html'));
});

// ───────── Error Handling ─────────

app.use(notFoundHandler);
app.use(globalErrorHandler);

// ───────── Startup ─────────

const DB_RETRY_DELAY_MS = parseInt(process.env.DB_RETRY_DELAY_MS, 10) || 5000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectDBWithRetry() {
  while (true) {
    try {
      await connectDB();
      return;
    } catch (err) {
      logger.error(`MongoDB init retry in ${DB_RETRY_DELAY_MS}ms: ${err.message}`);
      await delay(DB_RETRY_DELAY_MS);
    }
  }
}

async function start() {
  try {
    await connectRedis();
    initializeSocket(server);

    server.on('error', (err) => {
      logger.error('HTTP server failed to start:', err);
      process.exit(1);
    });

    server.listen(config.server.port, () => {
      logger.info(`╔══════════════════════════════════════════╗`);
      logger.info(`║  CAS Server running on port ${config.server.port}          ║`);
      logger.info(`║  Environment: ${config.server.env.padEnd(26)}║`);
      logger.info(`╚══════════════════════════════════════════╝`);
    });

    await connectDBWithRetry();
  } catch (err) {
    logger.error('Server startup failed:', err);
    process.exit(1);
  }
}

// ───────── Graceful Shutdown ─────────

const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await disconnectDB();
    await disconnectRedis();
    logger.info('Server shut down complete');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

start();

module.exports = app;
