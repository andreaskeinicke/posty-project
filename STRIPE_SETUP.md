# Stripe Setup Guide for Posty

## Overview

Posty uses Stripe for payment processing. This guide will help you set up Stripe in **test mode** so you can test the complete checkout flow.

## Step 1: Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Click "Sign up"
3. Complete the registration process
4. **Stay in test mode** (toggle in the top right corner should say "Test mode")

## Step 2: Get Your API Keys

1. Go to [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
2. You'll see two keys:
   - **Publishable key** - starts with `pk_test_`
   - **Secret key** - click "Reveal test key" to see it (starts with `sk_test_`)

### Update Backend .env

Edit `.env` in the project root:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

### Update Frontend .env

Edit `frontend/.env`:

```bash
# Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

## Step 3: Create a Product & Price

1. Go to [https://dashboard.stripe.com/test/products](https://dashboard.stripe.com/test/products)
2. Click **"Add product"**
3. Fill in:
   - **Name**: Posty Subscription
   - **Description**: Monthly subscription for custom email domain
   - **Pricing model**: Recurring
   - **Price**: $5.00 USD
   - **Billing period**: Monthly
4. Click **"Save product"**
5. **Copy the Price ID** - it looks like `price_1AbCdEfGhIjKlMnO`

### Update Backend .env

```bash
# Stripe Pricing
STRIPE_PRICE_ID=price_YOUR_PRICE_ID_HERE
```

## Step 4: Set Up Webhook (for local testing)

### Option A: Use Stripe CLI (Recommended)

1. Install Stripe CLI: [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download directly from GitHub
```

2. Login to Stripe CLI:

```bash
stripe login
```

3. Forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:3001/api/checkout/webhook
```

4. Copy the **webhook signing secret** from the output (starts with `whsec_`)

5. Update backend `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

### Option B: Skip Webhooks (for initial testing)

You can test the checkout flow without webhooks initially, but you won't see subscription/payment events in your database until webhooks are configured.

## Step 5: Test the Integration

### Start the servers:

```bash
# Terminal 1: Start backend
npm run server

# Terminal 2: Start frontend
npm run client

# Terminal 3 (if using webhooks): Forward webhooks
stripe listen --forward-to localhost:3001/api/checkout/webhook
```

### Test the checkout flow:

1. Go to http://localhost:3000
2. Complete the questionnaire
3. Select a domain (or trigger checkout manually)
4. Create an account (or login)
5. You should be redirected to Stripe Checkout

### Use Test Card:

When on Stripe Checkout page, use these test card numbers:

| Card Number | Scenario |
|------------|----------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0025 0000 3155 | Requires authentication (3D Secure) |
| 4000 0000 0000 9995 | Declined |

- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

### Verify Success:

After successful payment:
1. You should be redirected to `/checkout/success`
2. Check Supabase database:
   - `subscriptions` table should have a new record
   - `domains` table should have your domain (status: `pending_purchase`)
   - `transactions` table should have the payment record
3. Check Stripe Dashboard:
   - Go to [Payments](https://dashboard.stripe.com/test/payments)
   - You should see the successful payment

## Step 6: View Webhook Events

If you set up webhooks:

1. In the terminal running `stripe listen`, you'll see webhook events
2. In Stripe Dashboard, go to [Webhooks](https://dashboard.stripe.com/test/webhooks)
3. You can see all webhook events and their delivery status

## Common Issues

### "Stripe is not configured"

Make sure you've added the API keys to `.env` and restarted the backend server.

### "Invalid API key"

- Check that you're using **test mode** keys (they start with `sk_test_` and `pk_test_`)
- Make sure there are no extra spaces in the `.env` file

### Webhooks not receiving events

- Make sure `stripe listen` is running
- Check that the webhook secret matches in your `.env`
- Verify the forward URL is correct: `localhost:3001/api/checkout/webhook`

### "Price ID not found"

- Make sure you created the product and price in Stripe
- Copy the **Price ID** (not the Product ID)
- Update `STRIPE_PRICE_ID` in backend `.env`

## Going to Production

**Do NOT use test mode in production!**

When ready to go live:

1. Complete Stripe account activation
2. Switch to **Live mode** in Stripe Dashboard
3. Get your **live API keys** (start with `sk_live_` and `pk_live_`)
4. Create live products and prices
5. Set up **production webhooks** in Stripe Dashboard:
   - Go to Webhooks → Add endpoint
   - URL: `https://your-domain.com/api/checkout/webhook`
   - Events to send: Select all `checkout.`, `customer.subscription.`, and `invoice.` events
6. Update `.env` with live keys and webhook secret

## Useful Links

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe CLI Docs](https://stripe.com/docs/stripe-cli)
- [Webhook Events](https://stripe.com/docs/api/events/types)

---

Happy testing! 🎉
