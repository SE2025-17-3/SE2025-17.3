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

export default {
  getWallet,
  getWalletSummary,
  getTransactions
};
