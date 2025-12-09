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
      enableReadyCheck: false, // Don't check connection on startup
      maxRetriesPerRequest: null, // Retry indefinitely (for DLQ testing)
      lazyConnect: true, // Don't connect immediately
      retryStrategy(times) {
        const delay = 5000;
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
    
    // Try to connect but don't fail if it doesn't work
    publisherClient.connect().catch(err => {
      console.warn('⚠️ Redis Publisher initial connection failed, will retry:', err.message);
    });
  }
  return publisherClient;
};

/**
 * Get Redis client for consuming streams
 */
export const getSubscriber = () => {
  if (!subscriberClient) {
    subscriberClient = new Redis(REDIS_URL, {
      enableReadyCheck: false, // Don't check connection on startup
      maxRetriesPerRequest: null, // Retry indefinitely (for DLQ testing)
      lazyConnect: true, // Don't connect immediately
      retryStrategy(times) {
        const delay = 5000;
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
    
    // Try to connect but don't fail if it doesn't work
    subscriberClient.connect().catch(err => {
      console.warn('⚠️ Redis Subscriber initial connection failed, will retry:', err.message);
    });
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
        const delay = 5000;
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
// In redis.js - closeAllRedisConnections()
export const closeAllRedisConnections = async () => {
  console.log('🔌 Closing all Redis connections...');
  const promises = [];
  
  if (publisherClient) {
    promises.push(
      publisherClient.disconnect()  // Changed from .quit()
        .catch(err => console.error('Error closing publisher:', err.message))
    );
  }
  if (subscriberClient) {
    promises.push(
      subscriberClient.disconnect()  // Changed from .quit()
        .catch(err => console.error('Error closing subscriber:', err.message))
    );
  }
  if (generalClient) {
    promises.push(
      generalClient.disconnect()  // Changed from .quit()
        .catch(err => console.error('Error closing general client:', err.message))
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
