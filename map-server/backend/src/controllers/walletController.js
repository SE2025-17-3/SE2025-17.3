// backend/src/controllers/walletController.js
import * as walletService from '../services/walletService.js';

/**
 * GET /api/wallet
 * Get wallet balance
 */
export const getWallet = async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const wallet = await walletService.getWalletBalance(userId);
    res.json(wallet);
  } catch (error) {
    console.error('Error getting wallet:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/wallet/summary
 * Get wallet summary with recent transactions
 */
export const getWalletSummary = async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const summary = await walletService.getWalletSummary(userId);
    res.json(summary);
  } catch (error) {
    console.error('Error getting wallet summary:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/wallet/transactions
 * Get transaction history
 */
export const getTransactions = async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const history = await walletService.getTransactionHistory(userId, limit, skip);
    res.json(history);
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/wallet/admin/grant
 * Admin: Grant droplets to user
 */
export const adminGrantDroplets = async (req, res) => {
  try {
    const adminId = req.session?.userId;
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // TODO: Add admin role check here
    // const admin = await User.findById(adminId);
    // if (!admin.isAdmin) {
    //   return res.status(403).json({ error: 'Forbidden: Admin access required' });
    // }

    const { targetUserId, amount, reason } = req.body;

    if (!targetUserId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const result = await walletService.adminGrantDroplets(
      targetUserId,
      amount,
      adminId,
      reason || 'Admin grant'
    );

    res.json({
      success: true,
      message: `Granted ${amount} droplets to user ${targetUserId}`,
      ...result
    });
  } catch (error) {
    console.error('Error granting droplets:', error);
    res.status(500).json({ error: error.message });
  }
};
