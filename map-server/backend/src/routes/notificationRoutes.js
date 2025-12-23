// backend/src/routes/notificationRoutes.js
import express from 'express';
import * as notificationController from '../controllers/notificationController.js';

const router = express.Router();

// GET /api/notifications - Get user's notifications (paginated)
router.get('/', notificationController.getNotifications);

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /api/notifications/:id/read - Mark a notification as read
router.patch('/:id/read', notificationController.markAsRead);

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);

export default router;

