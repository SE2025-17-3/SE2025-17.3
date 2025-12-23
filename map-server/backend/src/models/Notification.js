// backend/src/models/Notification.js
import mongoose from 'mongoose';

/**
 * Notification Model
 * Stores user notifications for both push and pull delivery
 */
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      'team_member_joined',
      'team_member_left',
      'challenge_completed',
      'droplets_earned',
      'droplets_spent',
      'payment_success',
      'badge_earned',
      'pixel_overwritten',
    ],
    index: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: {
    type: Date,
    default: null,
  },
}, { 
  timestamps: true,
});

// Compound indexes for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

// TTL index - automatically delete notifications after 30 days
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days
);

/**
 * Get notifications for a user
 * @param {ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const { limit = 50, skip = 0, unreadOnly = false } = options;
  
  const query = { userId };
  if (unreadOnly) {
    query.read = false;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();
};

/**
 * Get unread count for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<number>}
 */
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, read: false });
};

/**
 * Mark notification as read
 * @param {ObjectId} notificationId - Notification ID
 * @param {ObjectId} userId - User ID (for security)
 * @returns {Promise}
 */
notificationSchema.statics.markAsRead = function(notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true, readAt: new Date() },
    { new: true }
  );
};

/**
 * Mark all notifications as read for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise}
 */
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );
};

export default mongoose.model('Notification', notificationSchema);

