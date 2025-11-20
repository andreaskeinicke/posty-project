# Stripe Setup Guide

This guide will walk you through setting up your Stripe product and configuring your Posty application for payments.

## Step 1: Create Stripe Product

1. **Go to Stripe Dashboard**
   - Visit: https://dashboard.stripe.com/test/products
   - Make sure you're in **Test Mode** (toggle in top right)

2. **Create Posty Product** (if you haven't already)
   - Click **"+ Add Product"**
   - **Product Information:**
     - Name: `Posty`
     - Description: `Custom domain email with Gmail integration`
   - **Pricing:**
     - Model: `Recurring`
     - Price: `$5.00 USD`
     - Billing Period: `Monthly`
   - Click **"Save product"**
   - **Copy the Price ID** (starts with `price_`) - you'll need this!

## Step 2: Get Your Stripe API Keys

1. **Get Secret Key**
   - Visit: https://dashboard.stripe.com/test/apikeys
   - Copy the **"Secret key"** (starts with `sk_test_`)
   - ⚠️ **Never commit this to git or share publicly!**

2. **You already have:**
   - Publishable key (in `frontend/.env`)
   - Webhook secret (from `stripe listen` command)

## Step 3: Configure Backend Environment

Create a `.env` file in the root directory:

```bash
# Copy from .env.example
cp .env.example .env
```

Then edit `.env` and add your configuration (use the values you already have plus new Stripe price IDs):

```bash
# Server
PORT=3001
NODE_ENV=development

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_457e93c153b8079a9b1c064a77066fd9dcc7e23b79c13a8436464567f56aaf13

# Stripe Product Price ID (from Step 1)
STRIPE_PRICE_ID=price_YOUR_PRICE_ID_HERE

# Supabase
SUPABASE_URL=https://noyrbkrsjlotxkbkwtep.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# Frontend URL
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Cloudflare (if you have it configured)
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

## Step 4: Restart Your Backend Server

After updating `.env`, restart your backend:

```bash
# Stop the backend (Ctrl+C)
# Then restart:
cd backend
node server.js
```

## Step 5: Test the Complete Flow

1. Visit http://localhost:3000
2. Complete the questionnaire
3. Choose a domain from suggestions
4. Click "Get Started" on the Posty Plan
5. Use Stripe test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`

## Troubleshooting

### "Stripe price ID not configured"
- Create the product in Stripe Dashboard
- Copy the **Price ID** (not Product ID!)
- Update `STRIPE_PRICE_ID` in `.env`
- Restart backend

### Webhook not working
- Ensure `stripe listen` is running
- Check webhook secret matches in `.env`
- Verify backend is on port 3001
