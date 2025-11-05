#!/bin/bash

###############################################################################
# Configure Neon Auth with WorkOS JWKS
#
# This script configures Neon Auth to validate WorkOS JWTs automatically.
#
# Prerequisites:
# - NEON_API_KEY environment variable
# - NEON_PROJECT_ID environment variable (from DATABASE_URL)
#
# Usage:
#   chmod +x scripts/configure-neon-auth.sh
#   ./scripts/configure-neon-auth.sh
###############################################################################

set -e # Exit on error

echo "🔧 Configuring Neon Auth with WorkOS..."
echo ""

# Check required environment variables
if [ -z "$NEON_API_KEY" ]; then
  echo "❌ Error: NEON_API_KEY is not set"
  echo "   Get your API key from: https://console.neon.tech/app/settings/api-keys"
  exit 1
fi

if [ -z "$NEON_PROJECT_ID" ]; then
  echo "❌ Error: NEON_PROJECT_ID is not set"
  echo "   Extract it from your DATABASE_URL"
  echo "   Format: postgresql://user:pass@PROJECT_ID.neon.tech/dbname"
  exit 1
fi

# WorkOS JWKS URL
WORKOS_JWKS_URL="https://api.workos.com/.well-known/jwks.json"

echo "📋 Configuration:"
echo "   Neon Project: $NEON_PROJECT_ID"
echo "   JWKS URL: $WORKOS_JWKS_URL"
echo ""

# Configure Neon Auth
echo "⏳ Configuring Neon Auth..."

curl -X POST \
  "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/auth/jwks" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"jwks_url\": \"$WORKOS_JWKS_URL\",
    \"role_names\": [\"neondb_owner\"]
  }"

echo ""
echo "✅ Neon Auth configured successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Verify auth.user_id() function exists in your database"
echo "   2. Test JWT validation with a sample token"
echo "   3. Deploy RLS policies"
echo ""
echo "🧪 Test with SQL:"
echo "   SELECT auth.user_id();"
echo ""

