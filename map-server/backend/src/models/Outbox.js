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
  // DLQ flag
  failed: {
    type: Boolean,
    default: false,
    index: true,
  },
});

// Compound index for efficient queries
outboxSchema.index({ published: 1, createdAt: 1 });
outboxSchema.index({ published: 1, failed: 1, attempts: 1 });

// TTL index - automatically delete published events after 7 days
// This keeps the outbox table from growing infinitely
outboxSchema.index(
  { publishedAt: 1 },
  { 
    expireAfterSeconds: 7 * 24 * 60 * 60, // 7 days
    partialFilterExpression: { published: true } // indexing publishedAt field only with document whose published field is true
  }
);

// TTL, delete failed events after 30 days
outboxSchema.index(
  {lastAttemptAt: 1},
  {
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days,
    partialFilterExpression: { failed: true },
  }
)

outboxSchema.index(
  {createdAt: 1},
  {
    expireAfterSeconds: 3 * 24 * 60 * 60, // 3 days
    partialFilterExpression: { failed: false, published: false },
  }
)

// Validation: Ensure pixel_placed events have required fields
outboxSchema.pre('save', function(next) {
  if (this.eventType === 'pixel_placed') {
    const { gx, gy, color } = this.payload;
    
    if (typeof gx !== 'number' || typeof gy !== 'number' || !color) {
      return next(new Error('Invalid pixel_placed event payload'));
    }
    
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      return next(new Error('Invalid color format'));
    }
  }
  
  next();
});

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

/**
 * Move event to DLQ (Dead Letter Queue)
 * @param {string} id - Event ID
 * @param {string} reason - Reason for DLQ
 * @returns {Promise}
 */
outboxSchema.statics.moveToDeadLetterQueue = function(id, reason) {
  return this.findByIdAndUpdate(
    id,
    {
      failed: true,
      lastAttemptAt: new Date(),
      error: reason,
    },
    { new: true }
  );
};

/**
 * Get failed events (DLQ) for monitoring/debugging
 * @param {number} limit - Maximum number of events to fetch
 * @returns {Promise<Array>}
 */
outboxSchema.statics.getFailedEvents = function(limit = 100) {
  return this.find({ failed: true })
    .sort({ lastAttemptAt: -1 }) // Most recent failures first
    .limit(limit)
    .exec();
};

/**
 * Get DLQ statistics
 * @returns {Promise<Object>}
 */
outboxSchema.statics.getDLQStats = async function() {
  const [total, byEventType] = await Promise.all([
    this.countDocuments({ failed: true }),
    this.aggregate([
      { $match: { failed: true } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } }
    ])
  ]);
  
  return {
    totalFailed: total,
    byEventType: byEventType.reduce((acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    }, {})
  };
};



export default mongoose.model('Outbox', outboxSchema);
