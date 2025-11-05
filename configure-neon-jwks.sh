#!/bin/bash

# Configure Neon Auth via API

set -e

echo "🔧 Configuring Neon Auth with WorkOS JWKS..."
echo ""

# Load WORKOS_CLIENT_ID
if [ -f .env ]; then
  export WORKOS_CLIENT_ID=$(grep '^WORKOS_CLIENT_ID=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
fi

# Check if we have required variables
if [ -z "$WORKOS_CLIENT_ID" ]; then
  echo "❌ Error: WORKOS_CLIENT_ID not found"
  exit 1
fi

# Construct JWKS URL
JWKS_URL="https://api.workos.com/sso/jwks/${WORKOS_CLIENT_ID}"

echo "📝 Configuration:"
echo "   JWKS URL: $JWKS_URL"
echo "   Client ID: $WORKOS_CLIENT_ID"
echo ""

# Check if NEON_API_KEY exists
if [ -z "$NEON_API_KEY" ]; then
  echo "⚠️  NEON_API_KEY not found in .env"
  echo ""
  echo "To set up Neon Auth via API, you need a Neon API key."
  echo ""
  echo "Get it from: https://console.neon.tech/app/settings/api-keys"
  echo ""
  echo "Then add to your .env file:"
  echo "NEON_API_KEY=your_api_key_here"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 Manual Configuration Steps:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "1. Go to Neon Console → Data API"
  echo "2. In 'Authentication Configuration':"
  echo "   - JWKS URL: $JWKS_URL"
  echo "   - JWT Audience: (leave blank)"
  echo "3. Click Save"
  echo ""
  exit 0
fi

echo "❌ Note: Neon Data API JWKS configuration might need to be done via UI"
echo "   The API endpoint for this is not yet documented."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Manual Configuration (Recommended):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to: https://console.neon.tech"
echo "2. Select your project"
echo "3. Go to: Data API section"
echo "4. Find: 'Authentication Configuration'"
echo "5. Enter:"
echo "   • JWKS URL: $JWKS_URL"
echo "   • JWT Audience: (leave BLANK - very important!)"
echo "6. Click 'Save' or 'Update'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
