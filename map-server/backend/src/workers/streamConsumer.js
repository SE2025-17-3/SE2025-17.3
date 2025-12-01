import { getSubscriber, STREAMS, CONSUMER_GROUPS } from '../config/redis.js';

/**
 * Redis Stream Consumer
 * Consumes pixel events from Redis Stream and broadcasts to Socket.IO clients
 * Uses consumer groups for reliability and scalability
 */
class StreamConsumer {
  constructor(io, options = {}) {
    this.io = io;
    this.consumerName = options.consumerName || `consumer-${process.pid}`;
    this.blockTime = options.blockTime || 1000; // Block for 1 second waiting for new messages
    this.batchSize = options.batchSize || 10;
    this.isRunning = false;
    this.redis = null;
  }

  /**
   * Initialize consumer group (idempotent - won't fail if already exists)
   */
  async initializeConsumerGroup() {
    try {
      await this.redis.xgroup(
        'CREATE',
        STREAMS.PIXEL_EVENTS,
        CONSUMER_GROUPS.PIXEL_BROADCASTERS,
        '0', // Start from beginning
        'MKSTREAM' // Create stream if it doesn't exist
      );
      console.log(`✅ Consumer group "${CONSUMER_GROUPS.PIXEL_BROADCASTERS}" created`);
    } catch (err) {
      if (err.message.includes('BUSYGROUP')) {
        console.log(`ℹ️ Consumer group "${CONSUMER_GROUPS.PIXEL_BROADCASTERS}" already exists`);
      } else {
        throw err;
      }
    }
  }

  /**
   * Start consuming messages
   */
  async start() {
    if (this.isRunning) {
      console.warn('⚠️ Stream consumer is already running');
      return;
    }

    this.redis = getSubscriber();
    this.isRunning = true;

    // Initialize consumer group
    await this.initializeConsumerGroup();

    console.log(`🚀 Stream consumer started (${this.consumerName})`);

    // Start consuming
    this.consume();
  }

  /**
   * Stop consuming
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping stream consumer...');
    this.isRunning = false;
    console.log('✅ Stream consumer stopped');
  }

  /**
   * Main consume loop
   */
  async consume() {
    while (this.isRunning) {
      try {
        // First, try to claim any pending messages that weren't acknowledged
        await this.processPendingMessages();

        // Then read new messages
        await this.readNewMessages();
      } catch (err) {
        console.error('❌ Error in stream consumer:', err);
        // Wait a bit before retrying to avoid tight error loop
        await this.sleep(1000);
      }
    }
  }

  /**
   * Process pending messages (messages that were delivered but not acknowledged)
   */
  async processPendingMessages() {
    try {
      const pending = await this.redis.xpending(
        STREAMS.PIXEL_EVENTS,
        CONSUMER_GROUPS.PIXEL_BROADCASTERS,
        '-', '+', 10 // Get up to 10 pending messages
      );

      if (pending.length === 0) {
        return;
      }

      console.log(`⚠️ Found ${pending.length} pending messages, reclaiming...`);

      for (const [messageId] of pending) {
        // Claim messages that have been pending for more than 5 seconds
        const claimed = await this.redis.xclaim(
          STREAMS.PIXEL_EVENTS,
          CONSUMER_GROUPS.PIXEL_BROADCASTERS,
          this.consumerName,
          5000, // Min idle time in ms
          messageId
        );

        if (claimed.length > 0) {
          await this.processMessages(claimed);
        }
      }
    } catch (err) {
      console.error('❌ Error processing pending messages:', err);
    }
  }

  /**
   * Read new messages from stream
   */
  async readNewMessages() {
    const results = await this.redis.xreadgroup(
      'GROUP',
      CONSUMER_GROUPS.PIXEL_BROADCASTERS,
      this.consumerName,
      'COUNT',
      this.batchSize,
      'BLOCK',
      this.blockTime,
      'STREAMS',
      STREAMS.PIXEL_EVENTS,
      '>' // Only new messages
    );

    if (!results || results.length === 0) {
      return; // No new messages
    }

    // Results format: [[streamName, [[messageId, [field1, value1, field2, value2, ...]], ...]], ...]
    for (const [streamName, messages] of results) {
      await this.processMessages(messages);
    }
  }

  /**
   * Process messages and broadcast to Socket.IO
   * @param {Array} messages - Array of [messageId, fields]
   */
  async processMessages(messages) {
    for (const [messageId, fields] of messages) {
      try {
        // Convert flat array to object
        const data = this.parseMessageFields(fields);

        // Broadcast to all connected Socket.IO clients
        this.io.emit('pixel_placed', {
          gx: parseInt(data.gx, 10),
          gy: parseInt(data.gy, 10),
          color: data.color,
        });

        console.log(`📡 Broadcasted pixel via Socket.IO: (${data.gx}, ${data.gy}) ${data.color}`);

        // Acknowledge the message
        await this.redis.xack(
          STREAMS.PIXEL_EVENTS,
          CONSUMER_GROUPS.PIXEL_BROADCASTERS,
          messageId
        );

      } catch (err) {
        console.error(`❌ Error processing message ${messageId}:`, err);
        // Don't acknowledge - message will be reprocessed
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

export default StreamConsumer;

