// frontend/src/services/walletApi.js
import api from './api';

/**
 * Get wallet balance
 */
export const getWallet = async () => {
  const response = await api.get('/wallet');
  return response.data;
};

/**
 * Get wallet summary with recent transactions
 */
export const getWalletSummary = async () => {
  const response = await api.get('/wallet/summary');
  return response.data;
};

/**
 * Get transaction history
 */
export const getTransactions = async (limit = 50, skip = 0) => {
  const response = await api.get('/wallet/transactions', {
    params: { limit, skip }
  });
  return response.data;
};

/**
 * Purchase max capacity with droplets
 */
export const purchaseCapacity = async (quantity) => {
  const response = await api.post('/store/purchase', {
    itemId: 'capacity_upgrade_simple',
    quantity
  });
  return response.data;
};

/**
 * Purchase energy recharge with droplets
 */
export const purchaseEnergy = async (quantity) => {
  const response = await api.post('/store/purchase', {
    itemId: 'energy_boost_simple',
    quantity
  });
  return response.data;
};

export default {
  getWallet,
  getWalletSummary,
  getTransactions,
  purchaseCapacity,
  purchaseEnergy
};
