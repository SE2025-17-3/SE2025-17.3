import Stripe from 'stripe';

let stripe = null;

const initializeStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️ STRIPE_SECRET_KEY not found in environment variables. Payment features will be disabled.');
    return null;
  }

  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia', // Latest stable version
    });
    console.log('✅ Stripe initialized successfully');
  }

  return stripe;
};

const getStripeClient = () => {
  if (!stripe) {
    return initializeStripe();
  }
  return stripe;
};

const isStripeEnabled = () => {
  return !!process.env.STRIPE_SECRET_KEY && !!stripe;
};

export {
  initializeStripe,
  getStripeClient,
  isStripeEnabled,
};
