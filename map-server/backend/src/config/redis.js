// D:\Code\SE2025-17.3\map-server\backend\src\config\redis.js
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// ƯU TIÊN:
// 1. REDIS_URL  (vd: redis://redis:6379 trong Docker)
// 2. REDIS_HOST + REDIS_PORT
// 3. Mặc định: redis://127.0.0.1:6379 (chạy local = terminal)
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_URL = process.env.REDIS_URL || `redis://${REDIS_HOST}:${REDIS_PORT}`;

// Create separate clients for different purposes
// Publisher and subscriber should use different connections
let publisherClient = null;
let subscriberClient = null;
let generalClient = null;

/**
 * Internal helper: tạo client Redis với cấu hình chung
 */
const createRedisClient = (label) => {
  const client = new Redis(REDIS_URL, {
    // family: 4, // Use IPv4
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err) {
      console.error(`❌ Redis ${label} error:`, err.message);
      return true; // Reconnect on all errors
    },
  });

  client.on('connect', () => console.log(`🔗 Redis ${label} connected (${REDIS_URL})`));
  client.on('error', (err) => console.error(`❌ Redis ${label} error:`, err));
  client.on('close', () => console.log(`🔌 Redis ${label} disconnected`));

  return client;
};

/**
 * Get Redis client for publishing to streams
 */
export const getPublisher = () => {
  if (!publisherClient) {
    publisherClient = createRedisClient('Publisher');
  }
  return publisherClient;
};

/**
 * Get Redis client for consuming streams
 */
export const getSubscriber = () => {
  if (!subscriberClient) {
    subscriberClient = createRedisClient('Subscriber');
  }
  return subscriberClient;
};

/**
 * Get general-purpose Redis client (for caching, etc.)
 */
export const getRedisClient = () => {
  if (!generalClient) {
    generalClient = createRedisClient('General Client');
  }
  return generalClient;
};

/**
 * Gracefully close all Redis connections
 */
export const closeAllRedisConnections = async () => {
  console.log('🔌 Closing all Redis connections...');
  const promises = [];

  if (publisherClient) {
    promises.push(
      publisherClient
        .quit()
        .catch((err) => console.error('Error closing publisher:', err))
    );
  }
  if (subscriberClient) {
    promises.push(
      subscriberClient
        .quit()
        .catch((err) => console.error('Error closing subscriber:', err))
    );
  }
  if (generalClient) {
    promises.push(
      generalClient
        .quit()
        .catch((err) => console.error('Error closing general client:', err))
    );
  }

  await Promise.all(promises);
  console.log('✅ All Redis connections closed');
};

// Stream names as constants
export const STREAMS = {
  PIXEL_EVENTS: 'pixels:events',
};

// Consumer group names
export const CONSUMER_GROUPS = {
  PIXEL_BROADCASTERS: 'pixel-broadcasters',
};