// backend/src/models/Transaction.js
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['earn', 'spend', 'purchase', 'refund', 'admin_grant'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  balanceBefore: {
    type: Number,
    required: true,
    min: 0
  },
  balanceAfter: {
    type: Number,
    required: true,
    min: 0
  },
  source: {
    type: String,
    required: true,
    // Examples: 'store_purchase', 'energy_boost', 'max_capacity_upgrade', 'challenge_reward', 'admin_grant', 'payment_package'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // Can store: itemId, packageId, quantity, description, etc.
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for user transactions sorted by time
transactionSchema.index({ userId: 1, timestamp: -1 });

// Static method to create transaction with validation
transactionSchema.statics.createTransaction = async function(data) {
  const { userId, type, amount, balanceBefore, balanceAfter, source, metadata } = data;
  
  // Validate balance logic
  if (type === 'earn' || type === 'purchase' || type === 'admin_grant' || type === 'refund') {
    if (balanceAfter !== balanceBefore + amount) {
      throw new Error('Invalid balance calculation for earn transaction');
    }
  } else if (type === 'spend') {
    if (balanceAfter !== balanceBefore - amount) {
      throw new Error('Invalid balance calculation for spend transaction');
    }
  }
  
  return await this.create({
    userId,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    source,
    metadata: metadata || {},
    timestamp: new Date()
  });
};

// Static method to get user transaction history
transactionSchema.statics.getUserHistory = async function(userId, limit = 50, skip = 0) {
  return await this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

// Static method to get transaction stats
transactionSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return stats.reduce((acc, stat) => {
    acc[stat._id] = {
      total: stat.totalAmount,
      count: stat.count
    };
    return acc;
  }, {});
};

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
