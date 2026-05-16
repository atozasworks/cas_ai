const Redis = require('ioredis');
const config = require('./index');
const logger = require('../middleware/logger');

let redisClient = null;
let redisSub = null;

const createRedisClient = (label = 'primary') => {
  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    retryStrategy: (times) => {
      if (times > config.redis.maxRetries) {
        logger.error(`Redis ${label}: max retries exceeded`);
        return null;
      }
      return Math.min(times * config.redis.retryDelayMs, 30000);
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  client.on('connect', () => logger.info(`Redis ${label}: connected`));
  client.on('ready', () => logger.info(`Redis ${label}: ready`));
  client.on('error', (err) => logger.error(`Redis ${label} error:`, err.message));
  client.on('close', () => logger.warn(`Redis ${label}: connection closed`));

  return client;
};

const connectRedis = async () => {
  let pub = null;
  let sub = null;
  try {
    pub = createRedisClient('primary');
    sub = createRedisClient('subscriber');
    await pub.connect();
    await sub.connect();
    redisClient = pub;
    redisSub = sub;
    logger.info('Redis clients initialized');
  } catch (err) {
    logger.warn('Redis connection failed — running without cache:', err.message);
    // Disconnect the clients to stop background reconnect retry loops.
    if (pub) { try { pub.disconnect(); } catch (_) {} }
    if (sub) { try { sub.disconnect(); } catch (_) {} }
    redisClient = null;
    redisSub = null;
  }
};

const getRedisClient = () => redisClient;
const getRedisSubscriber = () => redisSub;

const disconnectRedis = async () => {
  if (redisClient) await redisClient.quit();
  if (redisSub) await redisSub.quit();
  logger.info('Redis clients disconnected');
};

module.exports = { connectRedis, getRedisClient, getRedisSubscriber, disconnectRedis };
