// map-server/backend/src/routes/paymentRoutes.js
import express from 'express';
import paymentController from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/config', paymentController.getPublishableKey);

// Protected routes (require authentication)
router.get('/packages', protect, paymentController.getPackages);
router.post('/create-intent', protect, paymentController.createPaymentIntent);
router.post('/confirm-payment', protect, paymentController.confirmPayment);
router.get('/history', protect, paymentController.getPaymentHistory);
router.get('/stats', protect, paymentController.getPaymentStats);

// Webhook route (no auth - verified by Stripe signature)
// Note: This route needs raw body, so it should be registered before express.json() middleware
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

export default router;
