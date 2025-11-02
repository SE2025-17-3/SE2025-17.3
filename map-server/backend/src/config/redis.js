import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create separate clients for different purposes
// Publisher and subscriber should use different connections
let publisherClient = null;
let subscriberClient = null;
let generalClient = null;

/**
 * Get Redis client for publishing to streams
 */
export const getPublisher = () => {
  if (!publisherClient) {
    publisherClient = new Redis(REDIS_URL, {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        console.error('❌ Redis Publisher error:', err.message);
        return true; // Reconnect on all errors
      }
    });

    publisherClient.on('connect', () => console.log('🔗 Redis Publisher connected'));
    publisherClient.on('error', (err) => console.error('❌ Redis Publisher error:', err));
    publisherClient.on('close', () => console.log('🔌 Redis Publisher disconnected'));
  }
  return publisherClient;
};

/**
 * Get Redis client for consuming streams
 */
export const getSubscriber = () => {
  if (!subscriberClient) {
    subscriberClient = new Redis(REDIS_URL, {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        console.error('❌ Redis Subscriber error:', err.message);
        return true;
      }
    });

    subscriberClient.on('connect', () => console.log('🔗 Redis Subscriber connected'));
    subscriberClient.on('error', (err) => console.error('❌ Redis Subscriber error:', err));
    subscriberClient.on('close', () => console.log('🔌 Redis Subscriber disconnected'));
  }
  return subscriberClient;
};

/**
 * Get general-purpose Redis client (for caching, etc.)
 */
export const getRedisClient = () => {
  if (!generalClient) {
    generalClient = new Redis(REDIS_URL, {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        console.error('❌ Redis General Client error:', err.message);
        return true;
      }
    });

    generalClient.on('connect', () => console.log('🔗 Redis General Client connected'));
    generalClient.on('error', (err) => console.error('❌ Redis General Client error:', err));
    generalClient.on('close', () => console.log('🔌 Redis General Client disconnected'));
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
    promises.push(publisherClient.quit().catch(err => console.error('Error closing publisher:', err)));
  }
  if (subscriberClient) {
    promises.push(subscriberClient.quit().catch(err => console.error('Error closing subscriber:', err)));
  }
  if (generalClient) {
    promises.push(generalClient.quit().catch(err => console.error('Error closing general client:', err)));
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
