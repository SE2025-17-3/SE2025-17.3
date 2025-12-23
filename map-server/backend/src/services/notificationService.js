// backend/src/services/notificationService.js
import Notification from '../models/Notification.js';
import Outbox from '../models/Outbox.js';

/**
 * Create a notification (writes to outbox for reliable delivery)
 * @param {Object} params - Notification parameters
 * @param {ObjectId} params.userId - User ID to notify
 * @param {string} params.type - Notification type
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {Object} params.data - Additional data
 * @returns {Promise<Object>} - Created outbox entry
 */
export const createNotification = async ({ userId, type, title, message, data = {} }) => {
  const outboxEntry = await Outbox.create({
    eventType: 'notification',
    payload: {
      userId: userId.toString(),
      type,
      title,
      message,
      data,
      timestamp: Date.now(),
    },
    published: false,
  });

  return outboxEntry;
};

/**
 * Create multiple notifications (batch)
 * Used for fan-out scenarios like team notifications
 * @param {Array<Object>} notifications - Array of notification params
 * @returns {Promise<Array>} - Created outbox entries
 */
export const createNotificationBatch = async (notifications) => {
  const outboxEntries = notifications.map(({ userId, type, title, message, data = {} }) => ({
    eventType: 'notification',
    payload: {
      userId: userId.toString(),
      type,
      title,
      message,
      data,
      timestamp: Date.now(),
    },
    published: false,
  }));

  return await Outbox.insertMany(outboxEntries);
};

/**
 * Get notifications for a user
 * @param {ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
export const getUserNotifications = async (userId, options = {}) => {
  return await Notification.getUserNotifications(userId, options);
};

/**
 * Get unread count for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<number>}
 */
export const getUnreadCount = async (userId) => {
  return await Notification.getUnreadCount(userId);
};

/**
 * Mark notification as read
 * @param {ObjectId} notificationId - Notification ID
 * @param {ObjectId} userId - User ID (for security)
 * @returns {Promise}
 */
export const markAsRead = async (notificationId, userId) => {
  return await Notification.markAsRead(notificationId, userId);
};

/**
 * Mark all notifications as read for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise}
 */
export const markAllAsRead = async (userId) => {
  return await Notification.markAllAsRead(userId);
};

/**
 * Save notification directly to database (used by consumer)
 * @param {Object} params - Notification parameters
 * @returns {Promise<Object>} - Created notification
 */
export const saveNotification = async ({ userId, type, title, message, data = {} }) => {
  return await Notification.create({
    userId,
    type,
    title,
    message,
    data,
    read: false,
  });
};

