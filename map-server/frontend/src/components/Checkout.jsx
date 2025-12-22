// map-server/frontend/src/components/Checkout.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createPaymentIntent } from '../services/paymentApi';
import './Checkout.css';

// This will be loaded from backend
let stripePromise = null;

const CheckoutForm = ({ packageData, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}?payment_success=true`,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
        setIsProcessing(false);
      } else {
        // Payment succeeded - will redirect to return_url
        onSuccess?.();
      }
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMessage('An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <div className="checkout-package-summary">
        <h4>Order Summary</h4>
        <div className="summary-line">
          <span>Package:</span>
          <span>{packageData.name}</span>
        </div>
        <div className="summary-line">
          <span>Droplets:</span>
          <span>💧 {(packageData.baseDroplets + packageData.bonusDroplets).toLocaleString()}</span>
        </div>
        {packageData.bonusDroplets > 0 && (
          <div className="summary-line bonus">
            <span>Bonus:</span>
            <span>+{packageData.bonusDroplets.toLocaleString()} 💧 ({packageData.bonusPercentage}%)</span>
          </div>
        )}
        <div className="summary-line total">
          <span>Total:</span>
          <span>${(packageData.price / 100).toFixed(2)}</span>
        </div>
      </div>

      <div className="payment-element-container">
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="checkout-error">{errorMessage}</div>
      )}

      <div className="checkout-actions">
        <button 
          type="button" 
          onClick={onCancel} 
          className="btn-cancel"
          disabled={isProcessing}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={!stripe || isProcessing}
          className="btn-pay"
        >
          {isProcessing ? 'Processing...' : `Pay $${(packageData.price / 100).toFixed(2)}`}
        </button>
      </div>
    </form>
  );
};

CheckoutForm.propTypes = {
  packageData: PropTypes.object.isRequired,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func,
};

const Checkout = ({ packageData, onSuccess, onCancel }) => {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    initializeStripe();
  }, []);

  useEffect(() => {
    if (packageData) {
      createIntent();
    }
  }, [packageData]);

  const initializeStripe = async () => {
    try {
      const response = await fetch('/api/payments/config', {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success && data.publishableKey) {
        stripePromise = loadStripe(data.publishableKey);
      } else {
        setError('Stripe is not configured. Please contact support.');
      }
    } catch (err) {
      console.error('Error loading Stripe config:', err);
      setError('Failed to load payment system');
    }
  };

  const createIntent = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await createPaymentIntent(packageData.id);
      
      if (result.success) {
        setClientSecret(result.clientSecret);
      } else {
        setError(result.message || 'Failed to initialize payment');
      }
    } catch (err) {
      console.error('Error creating payment intent:', err);
      setError('Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="checkout-loading">
        <div className="spinner"></div>
        <p>Loading payment system...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="checkout-error-container">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
        <button onClick={onCancel} className="btn-back">Go Back</button>
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return null;
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#667eea',
        colorBackground: '#ffffff',
        colorText: '#333333',
        colorDanger: '#e74c3c',
        borderRadius: '8px',
      },
    },
  };

  return (
    <div className="checkout-container">
      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm 
          packageData={packageData} 
          onSuccess={onSuccess} 
          onCancel={onCancel} 
        />
      </Elements>
    </div>
  );
};

Checkout.propTypes = {
  packageData: PropTypes.object.isRequired,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func,
};

export default Checkout;
