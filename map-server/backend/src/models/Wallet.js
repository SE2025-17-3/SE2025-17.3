// backend/src/models/Wallet.js
import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  droplets: {
    type: Number,
    default: 0,
    min: 0,
    required: true
  },
  lifetimeDropletsEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  lifetimeDropletsSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual for total transactions
walletSchema.virtual('totalTransactions').get(function() {
  return this.lifetimeDropletsEarned + this.lifetimeDropletsSpent;
});

// Method to add droplets
walletSchema.methods.addDroplets = function(amount, source = 'unknown') {
  if (amount <= 0) throw new Error('Amount must be positive');
  
  this.droplets += amount;
  this.lifetimeDropletsEarned += amount;
  this.lastUpdated = new Date();
  
  return this;
};

// Method to deduct droplets
walletSchema.methods.deductDroplets = function(amount, reason = 'unknown') {
  if (amount <= 0) throw new Error('Amount must be positive');
  if (this.droplets < amount) throw new Error('Insufficient droplets');
  
  this.droplets -= amount;
  this.lifetimeDropletsSpent += amount;
  this.lastUpdated = new Date();
  
  return this;
};

// Static method to get or create wallet
walletSchema.statics.getOrCreateWallet = async function(userId) {
  let wallet = await this.findOne({ userId });
  
  if (!wallet) {
    wallet = await this.create({
      userId,
      droplets: 0,
      lifetimeDropletsEarned: 0,
      lifetimeDropletsSpent: 0
    });
  }
  
  return wallet;
};

const Wallet = mongoose.model('Wallet', walletSchema);

export default Wallet;
