import { getStripeClient, isStripeEnabled } from '../config/stripe.js';
import { getPackageById, getTotalDroplets } from '../config/paymentPackages.js';
import Payment from '../models/Payment.js';
import walletService from './walletService.js';
import User from '../models/User.js';

/**
 * Create a Stripe Payment Intent for a droplet package purchase
 */
const createPaymentIntent = async (userId, packageId) => {
  if (!isStripeEnabled()) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
  }

  const stripe = getStripeClient();
  const packageData = getPackageById(packageId);

  if (!packageData) {
    throw new Error(`Invalid package ID: ${packageId}`);
  }

  // Get user details for customer creation
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  try {
    // Create or retrieve Stripe customer
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: userId.toString(),
          username: user.username,
        },
      });
      stripeCustomerId = customer.id;

      // Save Stripe customer ID to user
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: packageData.price,
      currency: 'usd',
      customer: stripeCustomerId,
      metadata: {
        userId: userId.toString(),
        packageId: packageId,
        baseDroplets: packageData.baseDroplets.toString(),
        bonusDroplets: packageData.bonusDroplets.toString(),
        totalDroplets: getTotalDroplets(packageId).toString(),
      },
      description: `${packageData.name} - ${getTotalDroplets(packageId)} droplets`,
    });

    // Create payment record in database
    const payment = await Payment.createPayment({
      userId,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId,
      packageId,
      amount: packageData.price,
      currency: 'usd',
      dropletsAwarded: getTotalDroplets(packageId),
      bonusDroplets: packageData.bonusDroplets,
      status: 'pending',
      metadata: {
        packageName: packageData.name,
        bonusPercentage: packageData.bonusPercentage,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: packageData.price,
      packageData,
      payment,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }
};

/**
 * Handle Stripe webhook events
 */
const handleWebhookEvent = async (event, io) => {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object, io);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error handling webhook event:', error);
    throw error;
  }
};

/**
 * Handle successful payment and award droplets
 */
const handlePaymentSuccess = async (paymentIntent, io) => {
  const { id, metadata } = paymentIntent;

  try {
    // Find payment record
    const payment = await Payment.findOne({ stripePaymentIntentId: id });

    if (!payment) {
      console.error(`Payment record not found for payment intent: ${id}`);
      return;
    }

    // Check if already processed
    if (payment.status === 'succeeded') {
      console.log(`Payment ${id} already processed`);
      return;
    }

    // Update payment status
    await payment.updateStatus('succeeded', {
      paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
    });

    // Award droplets to user's wallet
    const totalDroplets = payment.dropletsAwarded;
    await walletService.addDroplets(
      payment.userId,
      totalDroplets,
      'purchase',
      `Purchased ${payment.packageId} - ${totalDroplets} droplets`,
      {
        paymentId: payment._id,
        paymentIntentId: id,
        packageId: payment.packageId,
        bonusDroplets: payment.bonusDroplets,
      }
    );

    console.log(`✅ Payment succeeded: ${id} - Awarded ${totalDroplets} droplets to user ${payment.userId}`);

    // Send real-time notification via Socket.IO
    if (io) {
      io.to(`user:${payment.userId}`).emit('payment_success', {
        paymentId: payment._id,
        packageId: payment.packageId,
        dropletsAwarded: totalDroplets,
        bonusDroplets: payment.bonusDroplets,
        timestamp: new Date(),
      });
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
    // Update payment status to failed if droplet award fails
    if (payment) {
      await payment.updateStatus('failed', {
        errorMessage: `Failed to award droplets: ${error.message}`,
      });
    }
    throw error;
  }
};

/**
 * Handle failed payment
 */
const handlePaymentFailure = async (paymentIntent) => {
  const { id } = paymentIntent;

  try {
    const payment = await Payment.findOne({ stripePaymentIntentId: id });

    if (!payment) {
      console.error(`Payment record not found for failed payment intent: ${id}`);
      return;
    }

    await payment.updateStatus('failed', {
      errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed',
    });

    console.log(`❌ Payment failed: ${id}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
};

/**
 * Handle refund
 */
const handleRefund = async (charge) => {
  const paymentIntentId = charge.payment_intent;

  try {
    const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });

    if (!payment) {
      console.error(`Payment record not found for refund: ${paymentIntentId}`);
      return;
    }

    // Process refund in database
    await payment.processRefund(charge.refund?.reason || 'Refund requested');

    // Deduct droplets from user's wallet
    await walletService.deductDroplets(
      payment.userId,
      payment.dropletsAwarded,
      'refund',
      `Refund for ${payment.packageId}`,
      {
        paymentId: payment._id,
        paymentIntentId: paymentIntentId,
      }
    );

    console.log(`💰 Refund processed: ${paymentIntentId} - Deducted ${payment.dropletsAwarded} droplets from user ${payment.userId}`);
  } catch (error) {
    console.error('Error handling refund:', error);
    throw error;
  }
};

/**
 * Get user's payment history
 */
const getUserPaymentHistory = async (userId, limit = 20) => {
  return Payment.getUserPaymentHistory(userId, limit);
};

/**
 * Get user's payment stats
 */
const getUserPaymentStats = async (userId) => {
  return Payment.getUserPaymentStats(userId);
};

/**
 * Get payment by ID
 */
const getPaymentById = async (paymentId) => {
  return Payment.findById(paymentId);
};

export default {
  createPaymentIntent,
  handleWebhookEvent,
  handlePaymentSuccess,
  handlePaymentFailure,
  handleRefund,
  getUserPaymentHistory,
  getUserPaymentStats,
  getPaymentById,
};
