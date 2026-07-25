#!/bin/bash

# Helper script to update .env with Namecheap and Cloudflare credentials
# Run this script and paste your credentials when prompted

echo "🔐 Secure Credential Setup for Posty"
echo "======================================"
echo ""

ENV_FILE=".env"

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

echo "This script will help you securely add your API credentials to .env"
echo ""

# Namecheap credentials
echo "📝 NAMECHEAP CREDENTIALS"
echo "------------------------"
read -p "Enter your Namecheap username: " NAMECHEAP_USER
read -p "Enter your Namecheap API key: " NAMECHEAP_KEY

# Update .env file with Namecheap credentials
sed -i.bak "s|NAMECHEAP_API_USER=.*|NAMECHEAP_API_USER=$NAMECHEAP_USER|g" "$ENV_FILE"
sed -i.bak "s|NAMECHEAP_API_KEY=.*|NAMECHEAP_API_KEY=$NAMECHEAP_KEY|g" "$ENV_FILE"
sed -i.bak "s|NAMECHEAP_CLIENT_IP=.*|NAMECHEAP_CLIENT_IP=212.10.122.28|g" "$ENV_FILE"

echo "✅ Namecheap credentials added"
echo ""

# Cloudflare credentials (optional for now)
echo "📝 CLOUDFLARE CREDENTIALS (Optional - press Enter to skip)"
echo "-----------------------------------------------------------"
read -p "Enter your Cloudflare API Token (or press Enter to skip): " CLOUDFLARE_TOKEN

if [ ! -z "$CLOUDFLARE_TOKEN" ]; then
    read -p "Enter your Cloudflare Account ID: " CLOUDFLARE_ACCOUNT

    sed -i.bak "s|CLOUDFLARE_API_TOKEN=.*|CLOUDFLARE_API_TOKEN=$CLOUDFLARE_TOKEN|g" "$ENV_FILE"
    sed -i.bak "s|CLOUDFLARE_ACCOUNT_ID=.*|CLOUDFLARE_ACCOUNT_ID=$CLOUDFLARE_ACCOUNT|g" "$ENV_FILE"

    echo "✅ Cloudflare credentials added"
else
    echo "⏭️  Skipping Cloudflare (you can add these later)"
fi

echo ""
echo "✅ All credentials updated in .env file!"
echo ""
echo "🔒 Security reminder:"
echo "   - Never commit .env to git"
echo "   - .env.bak backup created"
echo ""
echo "Next steps:"
echo "1. Run: npm run server"
echo "2. Check for initialization messages"
echo ""
