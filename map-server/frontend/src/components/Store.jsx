// frontend/src/components/Store.jsx
import React, { useState, useEffect } from 'react';
import './Store.css';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import * as walletService from '../services/walletApi';
import PackageSelector from './PackageSelector';
import Checkout from './Checkout';
import PaymentSuccess from './PaymentSuccess';

const Store = ({ isOpen, onClose }) => {
  const { wallet, refreshWallet } = useWallet();
  const { refreshUser } = useAuth();

  // View toggle: 'store_items' or 'buy_droplets'
  const [currentView, setCurrentView] = useState('store_items');

  // Store items state
  const [capacityQuantity, setCapacityQuantity] = useState(1);
  const [rechargeQuantity, setRechargeQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);

  // Payment flow states
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Check for payment success on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_success') === 'true' || urlParams.get('payment_intent')) {
      setShowPaymentSuccess(true);
      setCurrentView('buy_droplets');
    }
  }, [isOpen]);

  const handlePurchaseCapacity = async () => {
    const totalCost = capacityQuantity;
    const capacityGain = capacityQuantity * 5;

    if (wallet.droplets < totalCost) {
      alert(`Insufficient droplets! You need ${totalCost} but have ${wallet.droplets}`);
      return;
    }

    if (!window.confirm(`Purchase +${capacityGain} max capacity for ${totalCost} droplets?`)) {
      return;
    }

    try {
      setPurchasing(true);
      await walletService.purchaseCapacity(capacityQuantity);

      alert(`✅ Success! Max capacity increased by ${capacityGain}!`);

      await refreshWallet();
      await refreshUser();
      setCapacityQuantity(1);
    } catch (err) {
      console.error('Purchase error:', err);
      alert(`❌ ${err.response?.data?.message || 'Purchase failed'}`);
    } finally {
      setPurchasing(false);
    }
  };

  const handlePurchaseRecharge = async () => {
    const totalCost = rechargeQuantity;
    const energyGain = rechargeQuantity * 30;

    if (wallet.droplets < totalCost) {
      alert(`Insufficient droplets! You need ${totalCost} but have ${wallet.droplets}`);
      return;
    }

    if (!window.confirm(`Purchase ${energyGain} energy charges for ${totalCost} droplets?`)) {
      return;
    }

    try {
      setPurchasing(true);
      await walletService.purchaseEnergy(rechargeQuantity);

      alert(`✅ Success! Added ${energyGain} energy charges!`);

      await refreshWallet();
      await refreshUser();
      setRechargeQuantity(1);
    } catch (err) {
      console.error('Purchase error:', err);
      alert(`❌ ${err.response?.data?.message || 'Purchase failed'}`);
    } finally {
      setPurchasing(false);
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
    setCurrentView('store_items');
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
          <div className="store-header-actions">
            <button
              className="droplet-toggle-btn"
              onClick={() => setCurrentView(currentView === 'store_items' ? 'buy_droplets' : 'store_items')}
              title={currentView === 'store_items' ? 'Buy Droplets' : 'Back to Store'}
            >
              💧
            </button>
            <div className="store-wallet-display">
              <span>💧</span>
              <span>{wallet.droplets.toLocaleString()}</span>
            </div>
          </div>
          <button className="store-close" onClick={onClose}>&times;</button>
        </div>

        <div className="store-content">
          {currentView === 'buy_droplets' ? (
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
            <div className="store-items-view">
              <h3 style={{ textAlign: 'center', marginBottom: '24px' }}>Purchase with Droplets</h3>

              <div className="store-purchase-grid">
                {/* Max Capacity Purchase */}
                <div className="store-purchase-card">
                  <div className="purchase-card-header">
                    <div className="purchase-icon">📦</div>
                    <div className="purchase-title">
                      <h3>Max Capacity</h3>
                      <p>Permanently increase your max paint charges</p>
                    </div>
                  </div>

                  <div className="purchase-conversion">
                    <span className="conversion-rate">1 💧 = +5 max capacity</span>
                  </div>

                  <div className="purchase-calculator">
                    <div className="calculator-row">
                      <label>Droplets to spend:</label>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={capacityQuantity}
                        onChange={(e) => setCapacityQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="quantity-input"
                      />
                    </div>
                    <div className="calculator-result">
                      You will gain: <strong>+{capacityQuantity * 5} max capacity</strong>
                    </div>
                  </div>

                  <div className="purchase-cost">
                    <span>Total Cost:</span>
                    <span className="cost-amount">💧 {capacityQuantity}</span>
                  </div>

                  <button
                    className="purchase-btn"
                    onClick={handlePurchaseCapacity}
                    disabled={purchasing || wallet.droplets < capacityQuantity}
                  >
                    {purchasing ? 'Processing...' : wallet.droplets < capacityQuantity ? 'Not Enough Droplets' : 'Purchase'}
                  </button>
                </div>

                {/* Energy Recharge Purchase */}
                <div className="store-purchase-card">
                  <div className="purchase-card-header">
                    <div className="purchase-icon">⚡</div>
                    <div className="purchase-title">
                      <h3>Energy Recharge</h3>
                      <p>Instantly gain paint charges</p>
                    </div>
                  </div>

                  <div className="purchase-conversion">
                    <span className="conversion-rate">1 💧 = +30 charges</span>
                  </div>

                  <div className="purchase-calculator">
                    <div className="calculator-row">
                      <label>Droplets to spend:</label>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={rechargeQuantity}
                        onChange={(e) => setRechargeQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="quantity-input"
                      />
                    </div>
                    <div className="calculator-result">
                      You will gain: <strong>+{rechargeQuantity * 30} energy charges</strong>
                    </div>
                  </div>

                  <div className="purchase-cost">
                    <span>Total Cost:</span>
                    <span className="cost-amount">💧 {rechargeQuantity}</span>
                  </div>

                  <button
                    className="purchase-btn"
                    onClick={handlePurchaseRecharge}
                    disabled={purchasing || wallet.droplets < rechargeQuantity}
                  >
                    {purchasing ? 'Processing...' : wallet.droplets < rechargeQuantity ? 'Not Enough Droplets' : 'Purchase'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Store;
