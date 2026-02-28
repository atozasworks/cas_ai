const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { connectDB, disconnectDB } = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');
const { initializeSocket } = require('./sockets');
const routes = require('./routes');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

const app = express();
const server = http.createServer(app);

// ───────── Global Middleware ─────────

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
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

app.use('/api/v1', routes);

// ───────── Error Handling ─────────

app.use(notFoundHandler);
app.use(globalErrorHandler);

// ───────── Startup ─────────

async function start() {
  try {
    await connectDB();
    await connectRedis();

    initializeSocket(server);

    server.listen(config.server.port, () => {
      logger.info(`╔══════════════════════════════════════════╗`);
      logger.info(`║  CAS Server running on port ${config.server.port}          ║`);
      logger.info(`║  Environment: ${config.server.env.padEnd(26)}║`);
      logger.info(`╚══════════════════════════════════════════╝`);
    });
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
