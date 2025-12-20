// frontend/src/components/Store.jsx
import React, { useState, useEffect } from 'react';
import './Store.css';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import * as storeApi from '../services/storeApi';
import PackageSelector from './PackageSelector';
import Checkout from './Checkout';
import PaymentSuccess from './PaymentSuccess';

const Store = ({ isOpen, onClose }) => {
  const { wallet, refreshWallet } = useWallet();
  const { refreshUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quantities, setQuantities] = useState({});
  const [purchasing, setPurchasing] = useState({});
  
  // Payment flow states
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Check for payment success on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_success') === 'true' || urlParams.get('payment_intent')) {
      setShowPaymentSuccess(true);
      setSelectedCategory('buy_droplets');
    }
  }, [isOpen]);

  // Fetch store items
  useEffect(() => {
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen, selectedCategory]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const category = selectedCategory === 'all' ? null : selectedCategory;
      const data = await storeApi.getStoreItems(category);
      setItems(data);
    } catch (err) {
      console.error('Error fetching store items:', err);
      setError(err.response?.data?.error || 'Failed to load store items');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (itemId, value) => {
    const qty = parseInt(value) || 1;
    setQuantities(prev => ({ ...prev, [itemId]: Math.max(1, qty) }));
  };

  const handlePurchase = async (item) => {
    const quantity = quantities[item.itemId] || 1;
    const totalCost = item.price * quantity;

    if (wallet.droplets < totalCost) {
      alert(`Insufficient droplets! You need ${totalCost} but have ${wallet.droplets}`);
      return;
    }

    if (!window.confirm(`Purchase ${quantity}x ${item.name} for ${totalCost} droplets?`)) {
      return;
    }

    try {
      setPurchasing(prev => ({ ...prev, [item.itemId]: true }));
      const result = await storeApi.purchaseItem(item.itemId, quantity);
      
      // Success message
      let message = `✅ Purchase successful!\n\n`;
      if (result.effect.type === 'instant_energy') {
        message += `+${result.effect.energyAdded} energy charges added!`;
        if (result.effect.wasted > 0) {
          message += `\n(${result.effect.wasted} wasted due to max capacity)`;
        }
      } else if (result.effect.type === 'max_capacity') {
        message += `Max capacity increased by ${result.effect.capacityIncrease}!\nOld: ${result.effect.oldMaxEnergy} → New: ${result.effect.newMaxEnergy}`;
      }
      
      alert(message);
      
      // Refresh wallet and user data
      await refreshWallet();
      await refreshUser();
      
      // Reset quantity
      setQuantities(prev => ({ ...prev, [item.itemId]: 1 }));
    } catch (err) {
      console.error('Purchase error:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Purchase failed';
      alert(`❌ ${errorMsg}`);
    } finally {
      setPurchasing(prev => ({ ...prev, [item.itemId]: false }));
    }
  };

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    setShowCheckout(true);
  };

  const handlePaymentSuccess = async () => {
    setShowCheckout(false);
    setSelectedPackage(null);
    await refreshWallet();
    alert('✅ Payment successful! Your droplets have been added to your account.');
  };

  const handlePaymentCancel = () => {
    setShowCheckout(false);
    setSelectedPackage(null);
  };

  const handlePaymentSuccessClose = () => {
    setShowPaymentSuccess(false);
    // Clear URL params
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  if (!isOpen) return null;

  return (
    <div className="store-modal-overlay" onClick={onClose}>
      <div className="store-modal" onClick={(e) => e.stopPropagation()}>
        <div className="store-header">
          <div className="store-title">
            <span style={{ fontSize: '36px' }}>🏪</span>
            <h2>Droplet Store</h2>
          </div>
          <div className="store-wallet-display">
            <span>💧</span>
            <span>{wallet.droplets.toLocaleString()}</span>
          </div>
          <button className="store-close" onClick={onClose}>&times;</button>
        </div>

        <div className="store-content">
          <div className="store-tabs">
            <button
              className={`store-tab ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All Items
            </button>
            <button
              className={`store-tab ${selectedCategory === 'energy_boost' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('energy_boost')}
            >
              ⚡ Energy Boosts
            </button>
            <button
              className={`store-tab ${selectedCategory === 'capacity_upgrade' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('capacity_upgrade')}
            >
              📦 Capacity Upgrades
            </button>
            <button
              className={`store-tab ${selectedCategory === 'buy_droplets' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('buy_droplets')}
            >
              💰 Buy Droplets
            </button>
          </div>

          {selectedCategory === 'buy_droplets' ? (
            showPaymentSuccess ? (
              <PaymentSuccess onClose={handlePaymentSuccessClose} />
            ) : showCheckout && selectedPackage ? (
              <Checkout
                packageData={selectedPackage}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            ) : (
              <PackageSelector
                onSelectPackage={handlePackageSelect}
                selectedPackageId={selectedPackage?.id}
              />
            )
          ) : (
            <>
              {loading && <div className="store-loading">Loading items...</div>}
              {error && <div className="store-error">{error}</div>}

              {!loading && !error && (
                <div className="store-items-grid">
                  {items.map(item => {
                    const quantity = quantities[item.itemId] || 1;
                    const totalCost = item.price * quantity;
                    const canAfford = wallet.droplets >= totalCost;
                    const isPurchasing = purchasing[item.itemId];

                return (
                  <div key={item.itemId} className="store-item-card">
                    <div className="store-item-header">
                      <div className="store-item-icon">{item.icon}</div>
                      <div className="store-item-title">
                        <h3>{item.name}</h3>
                        <p>{item.description}</p>
                      </div>
                    </div>

                    <div className="store-item-price">
                      <span>💧</span>
                      <span>{totalCost.toLocaleString()}</span>
                      {quantity > 1 && <span style={{ fontSize: '12px' }}>({item.price} each)</span>}
                    </div>

                    <div className="store-item-effect">
                      {item.effect.type === 'instant_energy' && (
                        `⚡ +${item.effect.value * 30 * quantity} energy charges`
                      )}
                      {item.effect.type === 'max_capacity' && (
                        `📦 +${item.effect.value * 5 * quantity} max capacity (permanent)`
                      )}
                    </div>

                    {item.dailyLimit && (
                      <div className="store-item-limit">
                        Daily Limit: {item.dailyLimit}
                      </div>
                    )}

                    <div className="store-item-actions">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(item.itemId, e.target.value)}
                        className="store-quantity-input"
                      />
                      <button
                        className="store-buy-button"
                        onClick={() => handlePurchase(item)}
                        disabled={!canAfford || isPurchasing}
                      >
                        {isPurchasing ? 'Purchasing...' : canAfford ? 'Buy Now' : 'Not Enough Droplets'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Store;
