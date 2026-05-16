const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../middleware/logger');

let isConnected = false;
let listenersAttached = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    isConnected = true;
    logger.info(`MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);

    if (!listenersAttached) {
      listenersAttached = true;

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        isConnected = false;
        logger.warn('MongoDB disconnected. Attempting reconnection...');
      });

      mongoose.connection.on('reconnected', () => {
        isConnected = true;
        logger.info('MongoDB reconnected');
      });
    }
  } catch (err) {
    logger.error('MongoDB connection failed:', err.message);
    throw err;
  }
};

const disconnectDB = async () => {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('MongoDB disconnected gracefully');
};

const isDBConnected = () => isConnected;

module.exports = { connectDB, disconnectDB, isDBConnected };
