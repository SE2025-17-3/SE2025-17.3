// backend/src/routes/walletRoutes.js
import express from 'express';
import * as walletController from '../controllers/walletController.js';

const router = express.Router();

// GET /api/wallet - Get wallet balance
router.get('/', walletController.getWallet);

// GET /api/wallet/summary - Get wallet summary with recent transactions
router.get('/summary', walletController.getWalletSummary);

// GET /api/wallet/transactions - Get transaction history
router.get('/transactions', walletController.getTransactions);

// POST /api/wallet/admin/grant - Admin: Grant droplets to user
router.post('/admin/grant', walletController.adminGrantDroplets);

export default router;
