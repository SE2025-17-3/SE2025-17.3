import { getSubscriber, STREAMS, CONSUMER_GROUPS, isRedisEnabled } from '../config/redis.js';
import { saveNotification } from '../services/notificationService.js';

// Push types - emit to Socket.IO immediately
const PUSH_TYPES = ['droplets_earned', 'droplets_spent', 'payment_success'];

/**
 * Notification Consumer
 * Consumes notification events from Redis Stream, saves to MongoDB,
 * and optionally broadcasts to Socket.IO based on notification type
 */
class NotificationConsumer {
  constructor(io, options = {}) {
    this.io = io;
    this.consumerName = options.consumerName || `notification-consumer-${process.pid}`;
    this.blockTime = options.blockTime || 1000;
    this.batchSize = options.batchSize || 10;
    this.isRunning = false;
    this.redis = null;
    this.enabled = isRedisEnabled();
  }

  /**
   * Initialize consumer group (idempotent - won't fail if already exists)
   */
  async initializeConsumerGroup() {
    try {
      await this.redis.xgroup(
        'CREATE',
        STREAMS.NOTIFICATIONS,
        CONSUMER_GROUPS.NOTIFICATION_PROCESSORS,
        '0',
        'MKSTREAM'
      );
      console.log(`✅ Consumer group "${CONSUMER_GROUPS.NOTIFICATION_PROCESSORS}" created`);
    } catch (err) {
      if (err.message.includes('BUSYGROUP')) {
        console.log(`ℹ️ Consumer group "${CONSUMER_GROUPS.NOTIFICATION_PROCESSORS}" already exists`);
      } else {
        throw err;
      }
    }
  }

  /**
   * Start consuming messages
   */
  async start() {
    if (!this.enabled) {
      console.log('⏭️ Notification consumer disabled (Redis not enabled)');
      return;
    }

    if (this.isRunning) {
      console.warn('⚠️ Notification consumer is already running');
      return;
    }

    this.redis = getSubscriber();
    this.isRunning = true;

    await this.initializeConsumerGroup();

    console.log(`🔔 Notification consumer started (${this.consumerName})`);

    this.consume();
  }

  /**
   * Stop consuming
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping notification consumer...');
    this.isRunning = false;
    console.log('✅ Notification consumer stopped');
  }

  /**
   * Main consume loop
   */
  async consume() {
    while (this.isRunning) {
      try {
        await this.processPendingMessages();
        await this.readNewMessages();
      } catch (err) {
        console.error('❌ Error in notification consumer:', err);
        await this.sleep(1000);
      }
    }
  }

  /**
   * Process pending messages
   */
  async processPendingMessages() {
    try {
      const pending = await this.redis.xpending(
        STREAMS.NOTIFICATIONS,
        CONSUMER_GROUPS.NOTIFICATION_PROCESSORS,
        '-', '+', 10
      );

      if (pending.length === 0) {
        return;
      }

      console.log(`⚠️ Found ${pending.length} pending notification messages, reclaiming...`);

      for (const [messageId] of pending) {
        const claimed = await this.redis.xclaim(
          STREAMS.NOTIFICATIONS,
          CONSUMER_GROUPS.NOTIFICATION_PROCESSORS,
          this.consumerName,
          5000,
          messageId
        );

        if (claimed.length > 0) {
          await this.processMessages(claimed);
        }
      }
    } catch (err) {
      console.error('❌ Error processing pending notification messages:', err);
    }
  }

  /**
   * Read new messages from stream
   */
  async readNewMessages() {
    const results = await this.redis.xreadgroup(
      'GROUP',
      CONSUMER_GROUPS.NOTIFICATION_PROCESSORS,
      this.consumerName,
      'COUNT',
      this.batchSize,
      'BLOCK',
      this.blockTime,
      'STREAMS',
      STREAMS.NOTIFICATIONS,
      '>'
    );

    if (!results || results.length === 0) {
      return;
    }

    for (const [streamName, messages] of results) {
      await this.processMessages(messages);
    }
  }

  /**
   * Process messages: save to MongoDB and optionally emit to Socket.IO
   * @param {Array} messages - Array of [messageId, fields]
   */
  async processMessages(messages) {
    for (const [messageId, fields] of messages) {
      try {
        const data = this.parseMessageFields(fields);

        // 1. Always persist to MongoDB
        const notification = await saveNotification({
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data ? JSON.parse(data.data) : {},
        });

        console.log(`💾 Saved notification: ${data.type} for user ${data.userId}`);

        // 2. Only emit Socket.IO for push types
        if (PUSH_TYPES.includes(data.type)) {
          this.io.to(data.userId).emit('notification', {
            _id: notification._id,
            type: data.type,
            title: data.title,
            message: data.message,
            data: notification.data,
            createdAt: notification.createdAt,
          });

          console.log(`📡 Pushed notification via Socket.IO: ${data.type} to user ${data.userId}`);
        }

        // Acknowledge the message
        await this.redis.xack(
          STREAMS.NOTIFICATIONS,
          CONSUMER_GROUPS.NOTIFICATION_PROCESSORS,
          messageId
        );

      } catch (err) {
        console.error(`❌ Error processing notification message ${messageId}:`, err);
      }
    }
  }

  /**
   * Parse Redis Stream message fields from flat array to object
   * @param {Array} fields - [field1, value1, field2, value2, ...]
   * @returns {Object}
   */
  parseMessageFields(fields) {
    const data = {};
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1];
    }
    return data;
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get consumer status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      consumerName: this.consumerName,
      blockTime: this.blockTime,
      batchSize: this.batchSize,
    };
  }
}

export default NotificationConsumer;

