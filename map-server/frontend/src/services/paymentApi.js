// map-server/frontend/src/services/paymentApi.js
import api from './api';

/**
 * Get Stripe publishable key
 */
export const getStripeConfig = async () => {
  try {
    const response = await api.get('/payments/config');
    return response.data;
  } catch (error) {
    console.error('Error fetching Stripe config:', error);
    throw error;
  }
};

/**
 * Get all available droplet packages
 */
export const getPackages = async () => {
  try {
    const response = await api.get('/payments/packages');
    return response.data;
  } catch (error) {
    console.error('Error fetching packages:', error);
    throw error;
  }
};

/**
 * Create a payment intent for a package
 */
export const createPaymentIntent = async (packageId) => {
  try {
    const response = await api.post('/payments/create-intent', { packageId });
    return response.data;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Get user's payment history
 */
export const getPaymentHistory = async (limit = 20) => {
  try {
    const response = await api.get('/payments/history', { params: { limit } });
    return response.data;
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }
};

/**
 * Get user's payment stats
 */
export const getPaymentStats = async () => {
  try {
    const response = await api.get('/payments/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    throw error;
  }
};

export default {
  getStripeConfig,
  getPackages,
  createPaymentIntent,
  getPaymentHistory,
  getPaymentStats,
};
