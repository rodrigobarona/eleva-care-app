#!/bin/bash

# Get WorkOS JWKS URL for Neon Auth Configuration
# This script constructs the correct JWKS URL using your WORKOS_CLIENT_ID

set -e

echo "🔍 Getting WorkOS JWKS URL..."
echo ""

# Load environment variables (only WORKOS_CLIENT_ID)
if [ -f .env ]; then
  export WORKOS_CLIENT_ID=$(grep '^WORKOS_CLIENT_ID=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
fi

# Check if WORKOS_CLIENT_ID is set
if [ -z "$WORKOS_CLIENT_ID" ]; then
  echo "❌ Error: WORKOS_CLIENT_ID not found in environment variables"
  echo ""
  echo "Please set it in your .env file:"
  echo "WORKOS_CLIENT_ID=client_xxxxxxxxxxxxx"
  exit 1
fi

# Construct JWKS URL
JWKS_URL="https://api.workos.com/sso/jwks/${WORKOS_CLIENT_ID}"

echo "✅ Your WorkOS Client ID: $WORKOS_CLIENT_ID"
echo ""
echo "📝 Your JWKS URL:"
echo "$JWKS_URL"
echo ""

# Test if JWKS URL is accessible
echo "🧪 Testing JWKS URL..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$JWKS_URL")

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ JWKS URL is accessible!"
  echo ""
  echo "📋 JWKS Response:"
  curl -s "$JWKS_URL" | python3 -m json.tool || curl -s "$JWKS_URL"
else
  echo "❌ Error: JWKS URL returned HTTP $HTTP_CODE"
  echo ""
  echo "Please verify your WORKOS_CLIENT_ID is correct."
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to Neon Console → Data API"
echo "2. Click 'Edit' on Authentication Configuration"
echo "3. Update JWKS URL to:"
echo ""
echo "   $JWKS_URL"
echo ""
echo "4. Click 'Save'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

