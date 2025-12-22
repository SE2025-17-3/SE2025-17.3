// frontend/src/context/WalletContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as walletApi from '../services/walletApi';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const { isLoggedIn, user } = useAuth();
  const [wallet, setWallet] = useState({
    droplets: 0,
    lifetimeEarned: 0,
    lifetimeSpent: 0,
    lastUpdated: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch wallet balance
  const fetchWallet = useCallback(async () => {
    if (!isLoggedIn) {
      setWallet({
        droplets: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        lastUpdated: null
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await walletApi.getWallet();
      setWallet(data);
    } catch (err) {
      console.error('Error fetching wallet:', err);
      setError(err.response?.data?.error || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  // Refresh wallet (used after purchases)
  const refreshWallet = useCallback(async () => {
    await fetchWallet();
  }, [fetchWallet]);

  // Update droplets locally (optimistic update)
  const updateDroplets = useCallback((newDroplets) => {
    setWallet(prev => ({
      ...prev,
      droplets: newDroplets
    }));
  }, []);

  // Load wallet on mount and when user logs in
  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const value = {
    wallet,
    loading,
    error,
    fetchWallet,
    refreshWallet,
    updateDroplets,
    droplets: wallet.droplets
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
