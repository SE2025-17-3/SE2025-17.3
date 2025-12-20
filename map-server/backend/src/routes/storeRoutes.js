// backend/src/routes/storeRoutes.js
import express from 'express';
import * as storeController from '../controllers/storeController.js';

const router = express.Router();

// GET /api/store/items - Get all store items (optionally filter by category)
router.get('/items', storeController.getStoreItems);

// GET /api/store/items/:itemId - Get specific store item
router.get('/items/:itemId', storeController.getStoreItem);

// POST /api/store/purchase - Purchase an item
router.post('/purchase', storeController.purchaseItem);

// GET /api/store/limits - Get user's daily purchase limits
router.get('/limits', storeController.getPurchaseLimits);

export default router;
