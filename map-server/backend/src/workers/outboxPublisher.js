import Outbox from '../models/Outbox.js';
import { getPublisher, STREAMS } from '../config/redis.js';

/**
 * Outbox Publisher Worker
 * Polls the outbox table and publishes unpublished events to Redis Stream
 * Ensures at-least-once delivery of events
 */
class OutboxPublisher {
  constructor(options = {}) {
    this.pollInterval = options.pollInterval || 100; // Poll every 100ms
    this.batchSize = options.batchSize || 50; // Process 50 events at a time
    this.isRunning = false;
    this.pollTimer = null;
    this.redis = null;
  }

  /**
   * Start the worker
   */
  async start() {
    if (this.isRunning) {
      console.warn('⚠️ Outbox publisher is already running');
      return;
    }

    this.redis = getPublisher();
    this.isRunning = true;
    console.log('🚀 Outbox publisher worker started');
    
    // Start polling
    this.poll();
  }

  /**
   * Stop the worker
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping outbox publisher worker...');
    this.isRunning = false;
    
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    console.log('✅ Outbox publisher worker stopped');
  }

  /**
   * Poll for unpublished events
   */
  async poll() {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.processEvents();
    } catch (err) {
      console.error('❌ Error in outbox publisher poll:', err);
    } finally {
      // Schedule next poll
      if (this.isRunning) {
        this.pollTimer = setTimeout(() => this.poll(), this.pollInterval);
      }
    }
  }

  /**
   * Process unpublished events from outbox
   */
  async processEvents() {
    // Get unpublished events
    const events = await Outbox.getUnpublished(this.batchSize);
    
    if (events.length === 0) {
      return; // No events to process
    }

    console.log(`📦 Processing ${events.length} outbox events...`);

    // Process each event
    for (const event of events) {
      try {
        await this.publishEvent(event);
      } catch (err) {
        console.error(`❌ Failed to publish event ${event._id}:`, err);
        
        // Record failure
        await Outbox.recordFailure(event._id, err.message);
        
        // If too many failures, we could implement dead letter queue
        if (event.attempts >= 5) {
          console.error(`💀 Event ${event._id} has failed ${event.attempts} times - needs manual intervention`);
        }
      }
    }
  }

  /**
   * Publish single event to Redis Stream
   * @param {Object} event - Outbox event document
   */
  async publishEvent(event) {
    const { _id, eventType, payload } = event;

    // Publish to Redis Stream
    const streamId = await this.redis.xadd(
      STREAMS.PIXEL_EVENTS,
      '*', // Auto-generate ID
      'eventType', eventType,
      'gx', payload.gx,
      'gy', payload.gy,
      'color', payload.color,
      'timestamp', payload.timestamp || Date.now(),
      'outboxId', _id.toString(), // Track which outbox event this came from
    );

    console.log(`📡 Published to Redis Stream: ${streamId} - Pixel (${payload.gx}, ${payload.gy})`);

    // Mark as published in database
    await Outbox.markAsPublished(_id);
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pollInterval: this.pollInterval,
      batchSize: this.batchSize,
    };
  }
}

// Export singleton instance
let publisherInstance = null;

export const getOutboxPublisher = (options) => {
  if (!publisherInstance) {
    publisherInstance = new OutboxPublisher(options);
  }
  return publisherInstance;
};

export default OutboxPublisher;

