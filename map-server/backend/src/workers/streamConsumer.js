// map-server/backend/src/workers/streamConsumer.js

import {
  getSubscriber,
  STREAMS,
  CONSUMER_GROUPS,
  isRedisEnabled,
} from '../config/redis.js';

/**
 * Redis Stream Consumer
 * Consumes pixel events from Redis Stream and broadcasts to Socket.IO clients
 * Uses consumer groups for reliability and scalability
 * OPTIMIZED: Uses batching to reduce socket emission overhead
 */
class StreamConsumer {
  constructor(io, options = {}) {
    this.io = io;
    this.consumerName = options.consumerName || `consumer-${process.pid}`;
    this.blockTime = options.blockTime || 1000; // ms
    this.batchSize = options.batchSize || 50; // Tăng batch size để đọc nhiều hơn mỗi lần
    this.isRunning = false;
    this.redis = null;
    this.enabled = isRedisEnabled();
    
    // Buffer để gom pixel trước khi gửi
    this.emitBuffer = [];
  }

  /* ===================== INIT CONSUMER GROUP ===================== */
  async initializeConsumerGroup() {
    try {
      await this.redis.xgroup(
          'CREATE',
          STREAMS.PIXEL_EVENTS,
          CONSUMER_GROUPS.PIXEL_BROADCASTERS,
          '0',
          'MKSTREAM'
      );
      console.log(
          `✅ Consumer group "${CONSUMER_GROUPS.PIXEL_BROADCASTERS}" created`
      );
    } catch (err) {
      if (err.message?.includes('BUSYGROUP')) {
        console.log(
            `ℹ️ Consumer group "${CONSUMER_GROUPS.PIXEL_BROADCASTERS}" already exists`
        );
      } else {
        throw err;
      }
    }
  }

  /* ===================== START ===================== */
  async start() {
    if (!this.enabled) {
      console.log('⏭️ Stream consumer disabled (Redis not enabled)');
      return;
    }

    if (this.isRunning) {
      console.warn('⚠️ Stream consumer is already running');
      return;
    }

    this.redis = getSubscriber();
    if (!this.redis) {
      console.warn('⚠️ Redis subscriber not available');
      return;
    }

    this.isRunning = true;

    await this.initializeConsumerGroup();

    console.log(`🚀 Stream consumer started (${this.consumerName})`);
    this.consume();
  }

  /* ===================== STOP ===================== */
  async stop() {
    if (!this.isRunning) return;

    console.log('🛑 Stopping stream consumer...');
    this.isRunning = false;
    console.log('✅ Stream consumer stopped');
  }

  /* ===================== MAIN LOOP ===================== */
  async consume() {
    while (this.isRunning) {
      try {
        await this.processPendingMessages();
        await this.readNewMessages();
      } catch (err) {
        console.error('❌ Error in stream consumer:', err);
        await this.sleep(1000);
      }
    }
  }

  /* ===================== PENDING ===================== */
  async processPendingMessages() {
    try {
      const pending = await this.redis.xpending(
          STREAMS.PIXEL_EVENTS,
          CONSUMER_GROUPS.PIXEL_BROADCASTERS,
          '-',
          '+',
          10
      );

      if (!pending || pending.length === 0) return;

      console.log(`⚠️ Reclaiming ${pending.length} pending messages`);

      for (const [messageId] of pending) {
        const claimed = await this.redis.xclaim(
            STREAMS.PIXEL_EVENTS,
            CONSUMER_GROUPS.PIXEL_BROADCASTERS,
            this.consumerName,
            5000,
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

  /* ===================== READ NEW ===================== */
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
        '>'
    );

    if (!results || results.length === 0) return;

    for (const [, messages] of results) {
      await this.processMessages(messages);
    }
  }

  /* ===================== PROCESS (BATCH OPTIMIZED) ===================== */
  async processMessages(messages) {
    for (const [messageId, fields] of messages) {
      try {
        const data = this.parseMessageFields(fields);

        // Thay vì emit ngay, ta đẩy vào buffer
        this.emitBuffer.push({
          gx: parseInt(data.gx, 10),
          gy: parseInt(data.gy, 10),
          color: data.color,
        });

        // Xác nhận đã xử lý xong với Redis
        await this.redis.xack(
            STREAMS.PIXEL_EVENTS,
            CONSUMER_GROUPS.PIXEL_BROADCASTERS,
            messageId
        );
      } catch (err) {
        console.error(`❌ Error processing message ${messageId}:`, err);
      }
    }

    // Sau khi xử lý hết đợt tin nhắn này, gửi 1 lần xuống Client
    this.flushBuffer();
  }

  flushBuffer() {
    if (this.emitBuffer.length > 0) {
      // Gửi sự kiện mới 'pixel_update_batch' chứa mảng pixel
      this.io.emit('pixel_update_batch', this.emitBuffer);
      
      // Xóa buffer
      this.emitBuffer = [];
    }
  }

  /* ===================== UTIL ===================== */
  parseMessageFields(fields) {
    const data = {};
    for (let i = 0; i < fields.length; i += 2) {
      data[fields[i]] = fields[i + 1];
    }
    return data;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /* ===================== STATUS ===================== */
  getStatus() {
    return {
      enabled: this.enabled,
      isRunning: this.isRunning,
      consumerName: this.consumerName,
      blockTime: this.blockTime,
      batchSize: this.batchSize,
    };
  }
}

export default StreamConsumer;