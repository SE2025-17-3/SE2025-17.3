// frontend/src/services/notificationApi.js
import api from './api';

/**
 * Get user's notifications (paginated)
 * @param {Object} params - Query params
 * @param {number} params.limit - Number of notifications to fetch
 * @param {number} params.skip - Number to skip (for pagination)
 * @param {boolean} params.unreadOnly - Only fetch unread notifications
 */
export const getNotifications = async ({ limit = 50, skip = 0, unreadOnly = false } = {}) => {
  const response = await api.get('/notifications', {
    params: { limit, skip, unreadOnly }
  });
  return response.data;
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
  const response = await api.get('/notifications/unread-count');
  return response.data;
};

/**
 * Mark a single notification as read
 * @param {string} notificationId 
 */
export const markAsRead = async (notificationId) => {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
  const response = await api.patch('/notifications/read-all');
  return response.data;
};
