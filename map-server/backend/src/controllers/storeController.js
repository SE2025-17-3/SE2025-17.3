// backend/src/controllers/storeController.js
import * as storeService from '../services/storeService.js';

/**
 * GET /api/store/items
 * Get all store items or filter by category
 */
export const getStoreItems = async (req, res) => {
  try {
    const { category } = req.query;
    const items = await storeService.getStoreItems(category);
    res.json(items);
  } catch (error) {
    console.error('Error getting store items:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/store/items/:itemId
 * Get specific store item
 */
export const getStoreItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await storeService.getStoreItem(itemId);
    res.json(item);
  } catch (error) {
    console.error('Error getting store item:', error);
    res.status(404).json({ error: error.message });
  }
};

/**
 * POST /api/store/purchase
 * Purchase an item from the store
 */
export const purchaseItem = async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { itemId, quantity } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: 'Item ID required' });
    }

    const qty = parseInt(quantity) || 1;
    if (qty <= 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    const result = await storeService.purchaseItem(userId, itemId, qty);
    res.json(result);
  } catch (error) {
    console.error('Error purchasing item:', error);
    
    // Handle specific errors
    if (error.message.includes('Insufficient droplets')) {
      return res.status(402).json({ error: 'Insufficient droplets', message: error.message });
    }
    if (error.message.includes('Daily purchase limit')) {
      return res.status(429).json({ error: 'Daily limit reached', message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Item not found', message: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/store/limits
 * Get user's purchase limits for items with daily limits
 */
export const getPurchaseLimits = async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limits = await storeService.getUserPurchaseLimits(userId);
    res.json(limits);
  } catch (error) {
    console.error('Error getting purchase limits:', error);
    res.status(500).json({ error: error.message });
  }
};
