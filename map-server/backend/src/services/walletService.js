// backend/src/services/walletService.js
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

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
