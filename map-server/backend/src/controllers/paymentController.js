import paymentService from '../services/paymentService.js';
import { getAllPackages } from '../config/paymentPackages.js';
import { getStripeClient, isStripeEnabled } from '../config/stripe.js';

/**
 * Get all available payment packages
 */
const getPackages = async (req, res) => {
  try {
    const packages = getAllPackages();
    res.json({
      success: true,
      packages,
      stripeEnabled: isStripeEnabled(),
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment packages',
      error: error.message,
    });
  }
};

/**
 * Create a payment intent for a package purchase
 */
const createPaymentIntent = async (req, res) => {
  try {
    const { packageId } = req.body;
    const userId = req.user._id;

    if (!packageId) {
      return res.status(400).json({
        success: false,
        message: 'Package ID is required',
      });
    }

    if (!isStripeEnabled()) {
      return res.status(503).json({
        success: false,
        message: 'Payment system is not available. Please contact support.',
      });
    }

    const result = await paymentService.createPaymentIntent(userId, packageId);

    res.json({
      success: true,
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      amount: result.amount,
      package: result.packageData,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment intent',
    });
  }
};

/**
 * Stripe webhook endpoint
 */
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    const stripe = getStripeClient();
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    // Pass Socket.IO instance from app
    const io = req.app.get('io');
    await paymentService.handleWebhookEvent(event, io);

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Get user's payment history
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 20;

    const history = await paymentService.getUserPaymentHistory(userId, limit);

    res.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message,
    });
  }
};

/**
 * Get user's payment stats
 */
const getPaymentStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await paymentService.getUserPaymentStats(userId);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment stats',
      error: error.message,
    });
  }
};

/**
 * Get Stripe publishable key
 */
const getPublishableKey = async (req, res) => {
  res.json({
    success: true,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    stripeEnabled: isStripeEnabled(),
  });
};

export default {
  getPackages,
  createPaymentIntent,
  handleWebhook,
  getPaymentHistory,
  getPaymentStats,
  getPublishableKey,
};
