import React, { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext';
import './PaymentSuccess.css';

const PaymentSuccess = ({ onClose }) => {
  const { refreshWallet } = useWallet();
  const [paymentStatus, setPaymentStatus] = useState('loading');
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => {
    // Get payment intent from URL
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');

    if (paymentIntent) {
      verifyPayment(paymentIntent);
    } else {
      setPaymentStatus('error');
    }
  }, []);

  const verifyPayment = async (paymentIntentId) => {
    try {
      // Refresh wallet to get updated balance
      await refreshWallet();
      setPaymentStatus('success');
      
      // Optionally, you could fetch payment details from backend
      // const response = await fetch(`/api/payments/intent/${paymentIntentId}`);
      // const data = await response.json();
      // setPaymentInfo(data);
    } catch (error) {
      console.error('Error verifying payment:', error);
      setPaymentStatus('error');
    }
  };

  const handleClose = () => {
    // Clear payment intent from URL
    window.history.replaceState({}, document.title, window.location.pathname);
    onClose();
  };

  if (paymentStatus === 'loading') {
    return (
      <div className="payment-success-container">
        <div className="spinner-large"></div>
        <h2>Verifying Payment...</h2>
        <p>Please wait while we confirm your purchase.</p>
      </div>
    );
  }

  if (paymentStatus === 'error') {
    return (
      <div className="payment-success-container">
        <div className="payment-icon error">❌</div>
        <h2>Payment Verification Failed</h2>
        <p>We couldn't verify your payment. Please contact support if you were charged.</p>
        <button className="btn-primary" onClick={handleClose}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="payment-success-container">
      <div className="payment-icon success">✅</div>
      <h2>Payment Successful!</h2>
      <p>Your droplets have been added to your account.</p>
      <div className="success-animation">
        <span className="droplet-rain">💧</span>
        <span className="droplet-rain">💧</span>
        <span className="droplet-rain">💧</span>
        <span className="droplet-rain">💧</span>
        <span className="droplet-rain">💧</span>
      </div>
      <button className="btn-primary" onClick={handleClose}>
        Start Painting!
      </button>
    </div>
  );
};

export default PaymentSuccess;
