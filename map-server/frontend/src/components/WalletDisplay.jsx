// frontend/src/components/WalletDisplay.jsx
import React from 'react';
import { useWallet } from '../context/WalletContext';

const WalletDisplay = ({ onClick }) => {
  const { wallet, loading } = useWallet();

  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1100,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        borderRadius: '999px',
        padding: '12px 20px',
        color: '#fff',
        fontWeight: '700',
        fontSize: '16px',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
      }}
      title="Open Store"
    >
      <span style={{ fontSize: '20px' }}>💧</span>
      <span>{loading ? '...' : wallet.droplets.toLocaleString()}</span>
    </button>
  );
};

export default WalletDisplay;
