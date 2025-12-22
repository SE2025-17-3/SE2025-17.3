import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// ƯU TIÊN:
// 1. REDIS_URL  (vd: redis://redis:6379 trong Docker)
// 2. REDIS_HOST + REDIS_PORT
// 3. Mặc định: redis://127.0.0.1:6379 (chạy local)
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_URL = process.env.REDIS_URL || `redis://${REDIS_HOST}:${REDIS_PORT}`;

// Clients riêng biệt cho các mục đích khác nhau
let publisherClient = null;
let subscriberClient = null;

/**
 * Kiểm tra Redis có được bật hay không
 * (dùng cho Outbox, Stream Consumer, v.v.)
 */
export const isRedisEnabled = () => {
  return !!REDIS_URL;
};

/**
 * Internal helper: tạo client Redis với cấu hình chung
 */
const createRedisClient = (label) => {
  const client = new Redis(REDIS_URL, {
    enableReadyCheck: true,
    maxRetriesPerRequest: null, // Quan trọng cho Redis Streams
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err) {
      console.error(`❌ Redis ${label} error:`, err.message);
      return true; // Luôn reconnect
    },
  });

  client.on('connect', () => console.log(`🔗 Redis ${label} connected`));
  client.on('error', (err) =>
      console.error(`❌ Redis ${label} connection error:`, err.message)
  );

  return client;
};

// --- QUAN TRỌNG: EXPORT CLIENT CHUNG ---
// Khởi tạo sẵn để controller dùng trực tiếp
export const redis = createRedisClient('General');

export const getRedisClient = () => redis;

/**
 * Redis client cho Publisher (Lazy load)
 */
export const getPublisher = () => {
  if (!publisherClient) {
    publisherClient = createRedisClient('Publisher');
  }
  return publisherClient;
};

/**
 * Redis client cho Subscriber / Consumer (Lazy load)
 */
export const getSubscriber = () => {
  if (!subscriberClient) {
    subscriberClient = createRedisClient('Subscriber');
  }
  return subscriberClient;
};

/**
 * Gracefully close tất cả Redis connections
 */
export const closeAllRedisConnections = async () => {
  console.log('🔌 Closing all Redis connections...');
  const promises = [];

  promises.push(
      redis.quit().catch((err) =>
          console.error('Error closing general client:', err)
      )
  );

  if (publisherClient) {
    promises.push(
        publisherClient.quit().catch((err) =>
            console.error('Error closing publisher:', err)
        )
    );
  }

  if (subscriberClient) {
    promises.push(
        subscriberClient.quit().catch((err) =>
            console.error('Error closing subscriber:', err)
        )
    );
  }

  await Promise.all(promises);
  console.log('✅ All Redis connections closed');
};

// Stream names
export const STREAMS = {
  PIXEL_EVENTS: 'pixels:events',
};

// Consumer group names
export const CONSUMER_GROUPS = {
  PIXEL_BROADCASTERS: 'pixel-broadcasters',
};
