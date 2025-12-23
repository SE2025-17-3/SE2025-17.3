// backend/src/services/walletService.js
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';
import { createNotification } from './notificationService.js';

/**
 * Get wallet balance for a user
 */
export const getWalletBalance = async (userId) => {
  const wallet = await Wallet.getOrCreateWallet(userId);
  return {
    droplets: wallet.droplets,
    lifetimeEarned: wallet.lifetimeDropletsEarned,
    lifetimeSpent: wallet.lifetimeDropletsSpent,
    lastUpdated: wallet.lastUpdated
  };
};

/**
 * Add droplets to user wallet (with transaction logging)
 */
export const addDroplets = async (userId, amount, source, metadata = {}) => {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const session = await mongoose.startSession();
  
  try {
    let wallet, transaction;
    
    await session.withTransaction(async () => {
      // Get or create wallet
      wallet = await Wallet.getOrCreateWallet(userId);
      
      const balanceBefore = wallet.droplets;
      
      // Add droplets
      wallet.addDroplets(amount, source);
      await wallet.save({ session });
      
      const balanceAfter = wallet.droplets;
      
      // Create transaction log
      transaction = await Transaction.createTransaction({
        userId,
        type: 'earn',
        amount,
        balanceBefore,
        balanceAfter,
        source,
        metadata
      });
    });
    
    // Create notification for droplets earned (push type)
    try {
      const sourceLabel = getSourceLabel(source);
      await createNotification({
        userId,
        type: 'droplets_earned',
        title: 'Droplets Earned!',
        message: `You earned ${amount} droplets from ${sourceLabel}`,
        data: {
          amount,
          source,
          newBalance: wallet.droplets,
          metadata,
        },
      });
    } catch (notifError) {
      console.warn('⚠️ Failed to create droplets_earned notification:', notifError.message);
    }
    
    return {
      success: true,
      newBalance: wallet.droplets,
      transaction
    };
  } catch (error) {
    throw new Error(`Failed to add droplets: ${error.message}`);
  } finally {
    session.endSession();
  }
};

/**
 * Get human-readable label for source
 */
const getSourceLabel = (source) => {
  const labels = {
    'challenge_reward': 'completing a challenge',
    'admin_grant': 'an admin grant',
    'payment': 'a purchase',
    'refund': 'a refund',
  };
  return labels[source] || source;
};

/**
 * Get human-readable label for spend reason
 */
const getReasonLabel = (reason) => {
  const labels = {
    'store_purchase': 'a store purchase',
    'energy_boost': 'an energy boost',
  };
  return labels[reason] || reason;
};

/**
 * Deduct droplets from user wallet (with transaction logging)
 */
export const deductDroplets = async (userId, amount, reason, metadata = {}) => {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const session = await mongoose.startSession();
  
  try {
    let wallet, transaction;
    
    await session.withTransaction(async () => {
      // Get wallet
      wallet = await Wallet.findOne({ userId }).session(session);
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      const balanceBefore = wallet.droplets;
      
      // Check sufficient balance
      if (wallet.droplets < amount) {
        throw new Error('Insufficient droplets');
      }
      
      // Deduct droplets
      wallet.deductDroplets(amount, reason);
      await wallet.save({ session });
      
      const balanceAfter = wallet.droplets;
      
      // Create transaction log
      transaction = await Transaction.createTransaction({
        userId,
        type: 'spend',
        amount,
        balanceBefore,
        balanceAfter,
        source: reason,
        metadata
      });
    });
    
    // Create notification for droplets spent (push type)
    try {
      const reasonLabel = getReasonLabel(reason);
      await createNotification({
        userId,
        type: 'droplets_spent',
        title: 'Droplets Spent',
        message: `You spent ${amount} droplets on ${reasonLabel}`,
        data: {
          amount,
          reason,
          newBalance: wallet.droplets,
          metadata,
        },
      });
    } catch (notifError) {
      console.warn('⚠️ Failed to create droplets_spent notification:', notifError.message);
    }
    
    return {
      success: true,
      newBalance: wallet.droplets,
      transaction
    };
  } catch (error) {
    throw new Error(`Failed to deduct droplets: ${error.message}`);
  } finally {
    session.endSession();
  }
};

/**
 * Get transaction history for a user
 */
export const getTransactionHistory = async (userId, limit = 50, skip = 0) => {
  const transactions = await Transaction.getUserHistory(userId, limit, skip);
  const stats = await Transaction.getUserStats(userId);
  
  return {
    transactions,
    stats,
    total: await Transaction.countDocuments({ userId })
  };
};

/**
 * Get wallet summary with recent transactions
 */
export const getWalletSummary = async (userId) => {
  const wallet = await getWalletBalance(userId);
  const { transactions, stats } = await getTransactionHistory(userId, 10, 0);
  
  return {
    wallet,
    recentTransactions: transactions,
    stats
  };
};

/**
 * Admin: Grant droplets to user
 */
export const adminGrantDroplets = async (userId, amount, adminId, reason) => {
  return await addDroplets(userId, amount, 'admin_grant', {
    grantedBy: adminId,
    reason
  });
};
