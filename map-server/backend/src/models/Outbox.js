import mongoose from 'mongoose';

/**
 * Outbox Pattern Model
 * Stores events that need to be published to Redis Stream
 * Ensures at-least-once delivery of events
 */
const outboxSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: ['pixel_placed'], // Can add more event types later
    index: true,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  published: {
    type: Boolean,
    default: false,
    index: true, // Index for fast lookup of unpublished events
  },
  publishedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  lastAttemptAt: {
    type: Date,
    default: null,
  },
  error: {
    type: String,
    default: null,
  },
});

// Compound index for efficient queries
outboxSchema.index({ published: 1, createdAt: 1 });

// TTL index - automatically delete published events after 7 days
// This keeps the outbox table from growing infinitely
outboxSchema.index(
  { publishedAt: 1 },
  { 
    expireAfterSeconds: 7 * 24 * 60 * 60, // 7 days
    partialFilterExpression: { published: true } // indexing publishedAt field only with document whose published field is true
  }
);

/**
 * Static method to get unpublished events
 * @param {number} limit - Maximum number of events to fetch
 * @returns {Promise<Array>}
 */
outboxSchema.statics.getUnpublished = function(limit = 100) {
  return this.find({ published: false })
    .sort({ createdAt: 1 }) // FIFO order
    .limit(limit)
    .exec();
};

/**
 * Mark event as published
 * @param {string} id - Event ID
 * @returns {Promise}
 */
outboxSchema.statics.markAsPublished = function(id) {
  return this.findByIdAndUpdate(
    id,
    { 
      published: true,
      publishedAt: new Date(),
      error: null,
    },
    { new: true }
  );
};

/**
 * Record failed publish attempt
 * @param {string} id - Event ID
 * @param {string} errorMessage - Error message
 * @returns {Promise}
 */
outboxSchema.statics.recordFailure = function(id, errorMessage) {
  return this.findByIdAndUpdate(
    id,
    {
      $inc: { attempts: 1 },
      lastAttemptAt: new Date(),
      error: errorMessage,
    },
    { new: true }
  );
};

export default mongoose.model('Outbox', outboxSchema);
