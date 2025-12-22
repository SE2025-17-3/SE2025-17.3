// map-server/backend/src/models/Payment.js
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  stripePaymentIntentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  stripeCustomerId: {
    type: String,
    index: true,
  },
  packageId: {
    type: String,
    required: true,
    enum: ['DROPLET_5', 'DROPLET_15', 'DROPLET_30', 'DROPLET_50', 'DROPLET_75', 'DROPLET_100'],
  },
  amount: {
    type: Number,
    required: true, // Amount in cents (e.g., 500 for $5.00)
  },
  currency: {
    type: String,
    required: true,
    default: 'usd',
  },
  dropletsAwarded: {
    type: Number,
    required: true,
  },
  bonusDroplets: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    required: true,
    index: true,
  },
  paymentMethod: {
    type: String, // e.g., 'card', 'paypal', etc.
  },
  errorMessage: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  refundedAt: {
    type: Date,
  },
  refundReason: {
    type: String,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Indexes for efficient queries
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

// Static method to create a new payment record
paymentSchema.statics.createPayment = async function(paymentData) {
  const payment = new this(paymentData);
  await payment.save();
  return payment;
};

// Static method to get user's payment history
paymentSchema.statics.getUserPaymentHistory = async function(userId, limit = 20) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to get payment stats for a user
paymentSchema.statics.getUserPaymentStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), status: 'succeeded' } },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: '$amount' },
        totalDroplets: { $sum: '$dropletsAwarded' },
        totalBonusDroplets: { $sum: '$bonusDroplets' },
        paymentCount: { $sum: 1 },
      },
    },
  ]);

  return stats.length > 0 ? stats[0] : {
    totalSpent: 0,
    totalDroplets: 0,
    totalBonusDroplets: 0,
    paymentCount: 0,
  };
};

// Instance method to update payment status
paymentSchema.methods.updateStatus = async function(status, metadata = {}) {
  this.status = status;
  if (metadata.errorMessage) {
    this.errorMessage = metadata.errorMessage;
  }
  if (metadata.paymentMethod) {
    this.paymentMethod = metadata.paymentMethod;
  }
  await this.save();
  return this;
};

// Instance method to process refund
paymentSchema.methods.processRefund = async function(reason) {
  this.status = 'refunded';
  this.refundedAt = new Date();
  this.refundReason = reason;
  await this.save();
  return this;
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
