// map-server/backend/src/workers/outboxPublisher.js

import Outbox from '../models/Outbox.js';
import { getPublisher, STREAMS, isRedisEnabled } from '../config/redis.js';

/**
 * Outbox Publisher Worker
 * Polls the outbox table and publishes unpublished events to Redis Stream
 * Ensures at-least-once delivery of events
 */
class OutboxPublisher {
  constructor(options = {}) {
    this.pollInterval = options.pollInterval || 100; // ms
    this.batchSize = options.batchSize || 50;
    this.isRunning = false;
    this.pollTimer = null;
    this.redis = null;
    this.enabled = isRedisEnabled(); // Redis ON/OFF flag
  }

  /* ===================== START ===================== */
  async start() {
    if (!this.enabled) {
      console.log('⏭️ Outbox publisher disabled (Redis not enabled)');
      return;
    }

    if (this.isRunning) {
      console.warn('⚠️ Outbox publisher is already running');
      return;
    }

    this.redis = getPublisher();
    if (!this.redis) {
      console.warn('⚠️ Redis publisher not available');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Outbox publisher worker started');
    this.poll();
  }

  /* ===================== STOP ===================== */
  async stop() {
    if (!this.isRunning) return;

    console.log('🛑 Stopping outbox publisher worker...');
    this.isRunning = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    console.log('✅ Outbox publisher worker stopped');
  }

  /* ===================== POLL LOOP ===================== */
  async poll() {
    if (!this.isRunning) return;

    try {
      await this.processEvents();
    } catch (err) {
      console.error('❌ Error in outbox publisher poll:', err);
    } finally {
      if (this.isRunning) {
        this.pollTimer = setTimeout(() => this.poll(), this.pollInterval);
      }
    }
  }

  /* ===================== PROCESS EVENTS ===================== */
  async processEvents() {
    const events = await Outbox.getUnpublished(this.batchSize);
    if (!events || events.length === 0) return;

    console.log(`📦 Processing ${events.length} outbox events`);

    for (const event of events) {
      try {
        await this.publishEvent(event);
      } catch (err) {
        console.error(`❌ Failed to publish event ${event._id}:`, err);

        await Outbox.recordFailure(event._id, err.message);

        if (event.attempts >= 5) {
          console.error(
              `💀 Event ${event._id} failed ${event.attempts} times – manual intervention needed`
          );
        }
      }
    }
  }

  /* ===================== PUBLISH EVENT ===================== */
  async publishEvent(event) {
    const { _id, eventType, payload } = event;

    const streamId = await this.redis.xadd(
        STREAMS.PIXEL_EVENTS,
        '*',
        'eventType',
        eventType,
        'gx',
        payload.gx,
        'gy',
        payload.gy,
        'color',
        payload.color,
        'timestamp',
        payload.timestamp || Date.now(),
        'outboxId',
        _id.toString()
    );

    console.log(
        `📡 Published event ${_id} → Stream ${STREAMS.PIXEL_EVENTS} (${streamId})`
    );

    await Outbox.markAsPublished(_id);
  }

  /* ===================== STATUS ===================== */
  getStatus() {
    return {
      enabled: this.enabled,
      isRunning: this.isRunning,
      pollInterval: this.pollInterval,
      batchSize: this.batchSize,
    };
  }
}

/* ===================== SINGLETON ===================== */
let publisherInstance = null;

export const getOutboxPublisher = (options) => {
  if (!publisherInstance) {
    publisherInstance = new OutboxPublisher(options);
  }
  return publisherInstance;
};

export default OutboxPublisher;
