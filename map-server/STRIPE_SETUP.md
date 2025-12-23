# Stripe Payment Gateway - Setup & Testing Guide

## 📋 Overview

The Stripe payment gateway enables users to purchase droplets using real money. This document provides complete setup instructions and testing procedures.

## 🔑 Setup Instructions

### 1. Get Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Switch to **Test Mode** (toggle in the top right)
3. Copy your **Publishable key** (starts with `pk_test_`)
4. Copy your **Secret key** (starts with `sk_test_`)

### 2. Configure Environment Variables

Update `/map-server/backend/.env`:

```env
# Stripe Payment Gateway Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

### 3. Set Up Stripe Webhook (For Local Testing)

For local development, you need to forward webhooks to your local server:

#### Option A: Using Stripe CLI (Recommended)

1. Install Stripe CLI:
   ```bash
   # Linux/macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:4000/api/payments/webhook
   ```

4. Copy the webhook signing secret (starts with `whsec_`) and add it to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

#### Option B: Using ngrok (Alternative)

1. Install ngrok: https://ngrok.com/download

2. Start ngrok:
   ```bash
   ngrok http 4000
   ```

3. Go to Stripe Dashboard → Developers → Webhooks → Add endpoint
   - Endpoint URL: `https://your-ngrok-url.ngrok.io/api/payments/webhook`
   - Events: Select `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`

4. Copy the webhook signing secret to `.env`

### 4. Start the Application

```bash
# Backend
cd map-server/backend
npm install
npm start

# Frontend
cd map-server/frontend
npm install
npm run dev
```

## 🧪 Testing Payment Flow

### Test Cards

Stripe provides test cards for different scenarios:

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | ✅ Success |
| `4000 0000 0000 9995` | ❌ Decline |
| `4000 0025 0000 3155` | 🔐 Requires 3D Secure |
| `4000 0000 0000 0002` | ❌ Card declined |

**Any future expiration date** (e.g., 12/34)  
**Any 3-digit CVC** (e.g., 123)  
**Any ZIP code** (e.g., 12345)

### Testing Steps

#### 1. Browse Packages
1. Login to your account
2. Click the **Store** button (under Leaderboard)
3. Click the **💰 Buy Droplets** tab
4. View available packages ($5 - $100)

#### 2. Select Package
1. Click on any package card
2. Verify the package details:
   - Base droplets
   - Bonus droplets (if applicable)
   - Total price

#### 3. Complete Payment
1. Fill in test card details:
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
   - ZIP: `12345`
2. Click **Pay $X.XX**
3. Wait for payment processing

#### 4. Verify Success
1. ✅ Success page should appear with droplet rain animation
2. Check your wallet balance (should be updated)
3. Check browser console for payment events
4. Check backend console for webhook logs

### Expected Behavior

#### Success Flow
```
1. User selects package → 
2. Payment intent created → 
3. Stripe checkout form appears → 
4. User enters card details → 
5. Payment processed → 
6. Webhook received (payment_intent.succeeded) → 
7. Droplets awarded to wallet → 
8. Socket.IO notification sent → 
9. Success page shown → 
10. Wallet balance updated
```

#### Logs to Check

**Backend Console:**
```
✅ Stripe initialized successfully
✅ Payment succeeded: pi_xxxxx - Awarded 25000 droplets to user xxxxx
```

**Frontend Console:**
```
Payment successful!
Wallet updated: +25000 💧
```

## 📊 Droplet Packages

| Package ID | Price | Base Droplets | Bonus | Total | Bonus % |
|-----------|-------|---------------|-------|-------|---------|
| DROPLET_5 | $5.00 | 25,000 | 0 | 25,000 | 0% |
| DROPLET_15 | $15.00 | 75,000 | 3,750 | 78,750 | 5% |
| DROPLET_30 | $30.00 | 150,000 | 15,000 | 165,000 | 10% |
| DROPLET_50 | $50.00 | 250,000 | 37,500 | 287,500 | 15% |
| DROPLET_75 | $75.00 | 375,000 | 75,000 | 450,000 | 20% |
| DROPLET_100 | $100.00 | 500,000 | 125,000 | 625,000 | 25% |

## 🔍 API Endpoints

### Public Endpoints
- `GET /api/payments/config` - Get Stripe publishable key

### Protected Endpoints (Require Authentication)
- `GET /api/payments/packages` - List all packages
- `POST /api/payments/create-intent` - Create payment intent
  ```json
  Body: { "packageId": "DROPLET_5" }
  ```
- `GET /api/payments/history?limit=20` - Get payment history
- `GET /api/payments/stats` - Get payment statistics

### Webhook Endpoint
- `POST /api/payments/webhook` - Stripe webhook handler (verified by signature)

## 🐛 Troubleshooting

### Issue: "Payment system is not available"
**Solution:** Check that `STRIPE_SECRET_KEY` is set in `.env` and server has been restarted

### Issue: "Webhook signature verification failed"
**Solution:** 
- Make sure `STRIPE_WEBHOOK_SECRET` matches the webhook secret from Stripe CLI or Dashboard
- Verify Stripe CLI is running: `stripe listen --forward-to localhost:4000/api/payments/webhook`

### Issue: Droplets not awarded after payment
**Solution:**
- Check backend console for webhook errors
- Verify webhook endpoint is receiving events
- Check MongoDB for Payment and Transaction records
- Ensure Socket.IO connection is active

### Issue: "Failed to load payment system"
**Solution:**
- Check browser console for CORS errors
- Verify frontend can reach `/api/payments/config`
- Check Stripe publishable key is correct

## 📝 Database Models

### Payment Model
```javascript
{
  userId: ObjectId,
  stripePaymentIntentId: String,
  stripeCustomerId: String,
  packageId: String,
  amount: Number,  // in cents
  currency: String,  // 'usd'
  dropletsAwarded: Number,
  bonusDroplets: Number,
  status: String,  // pending, succeeded, failed, refunded
  createdAt: Date,
  updatedAt: Date
}
```

### User Model (Updated)
```javascript
{
  // ... existing fields
  stripeCustomerId: String,  // NEW: Stripe customer ID
  // ... rest of fields
}
```

## 🚀 Going to Production

### Before Launch:
1. Switch Stripe account to **Live Mode**
2. Update `.env` with **live API keys** (starts with `pk_live_` and `sk_live_`)
3. Set up production webhook endpoint in Stripe Dashboard
4. Enable webhook events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
5. Test with real (small amount) transactions
6. Set up Stripe monitoring and alerts
7. Review Stripe's security best practices
8. Implement fraud detection rules in Stripe Dashboard

### Security Checklist:
- ✅ Never expose secret key to frontend
- ✅ Always verify webhook signatures
- ✅ Use HTTPS in production
- ✅ Enable Stripe Radar for fraud detection
- ✅ Set up email notifications for large transactions
- ✅ Implement rate limiting on payment endpoints
- ✅ Log all payment events for audit

## 📞 Support

For issues with:
- **Stripe Integration**: Check Stripe Dashboard → Logs
- **Webhook Events**: Use Stripe CLI `stripe logs tail`
- **Payment Failures**: Check Payment model in MongoDB
- **Droplet Issues**: Check Transaction model and Wallet service

---

**Created:** December 2024  
**Version:** 1.0.0  
**Status:** ✅ Ready for testing
