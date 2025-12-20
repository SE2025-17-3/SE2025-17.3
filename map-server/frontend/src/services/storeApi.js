// frontend/src/services/storeApi.js
import api from './api';

/**
 * Get all store items (optionally filtered by category)
 */
export const getStoreItems = async (category = null) => {
  const response = await api.get('/store/items', {
    params: category ? { category } : {}
  });
  return response.data;
};

/**
 * Get specific store item
 */
export const getStoreItem = async (itemId) => {
  const response = await api.get(`/store/items/${itemId}`);
  return response.data;
};

/**
 * Purchase an item from the store
 */
export const purchaseItem = async (itemId, quantity = 1) => {
  const response = await api.post('/store/purchase', { itemId, quantity });
  return response.data;
};

/**
 * Get user's daily purchase limits
 */
export const getPurchaseLimits = async () => {
  const response = await api.get('/store/limits');
  return response.data;
};

export default {
  getStoreItems,
  getStoreItem,
  purchaseItem,
  getPurchaseLimits
};
