#!/bin/bash

# WorkOS Migration Script
# Automatically replaces Clerk imports with WorkOS equivalents
# Run with: chmod +x migrate-clerk-to-workos.sh && ./migrate-clerk-to-workos.sh

set -e

echo "🚀 Starting Clerk to WorkOS migration..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for files modified
FILES_MODIFIED=0

# Function to update a file
update_file() {
    local file=$1
    local temp_file="${file}.tmp"
    
    # Skip if file doesn't exist
    if [ ! -f "$file" ]; then
        return
    fi
    
    # Skip docs, tests, and migration files
    if [[ $file == *"/docs/"* ]] || \
       [[ $file == *"/tests/"* ]] || \
       [[ $file == *"MIGRATION"* ]] || \
       [[ $file == *".md" ]] || \
       [[ $file == *"package.json" ]] || \
       [[ $file == *"pnpm-lock.yaml" ]]; then
        return
    fi
    
    # Check if file contains Clerk imports
    if ! grep -q "from '@clerk" "$file"; then
        return
    fi
    
    echo -e "${YELLOW}Updating:${NC} $file"
    
    # Create backup
    cp "$file" "${file}.backup"
    
    # Replace Clerk imports with WorkOS
    sed -i.bak \
        -e "s/import { auth } from '@clerk\/nextjs\/server';/import { withAuth } from '@workos-inc\/authkit-nextjs';/g" \
        -e "s/import { auth, currentUser } from '@clerk\/nextjs\/server';/import { withAuth } from '@workos-inc\/authkit-nextjs';/g" \
        -e "s/import { currentUser } from '@clerk\/nextjs\/server';/import { withAuth } from '@workos-inc\/authkit-nextjs';/g" \
        -e "s/import { useUser } from '@clerk\/nextjs';/import { useAuth } from '@workos-inc\/authkit-nextjs\/components';/g" \
        "$file"
    
    # Replace auth() calls in Server Components and API routes
    sed -i.bak \
        -e "s/const { userId } = await auth();/const { user } = await withAuth();\\n  const userId = user?.id;/g" \
        -e "s/const { userId } = await auth()/const { user } = await withAuth()\\n  const userId = user?.id/g" \
        "$file"
    
    # Replace useUser() calls in Client Components
    sed -i.bak \
        -e "s/const { user, isLoaded } = useUser();/const { user, loading } = useAuth();\\n  const isLoaded = !loading;/g" \
        -e "s/const { user } = useUser();/const { user } = useAuth();/g" \
        "$file"
    
    # Replace currentUser() calls
    sed -i.bak \
        -e "s/const user = await currentUser();/const { user } = await withAuth();/g" \
        "$file"
    
    # Clean up backup files
    rm "${file}.bak" 2>/dev/null || true
    
    FILES_MODIFIED=$((FILES_MODIFIED + 1))
}

# Find and update all TypeScript/TSX files
echo "📝 Scanning for files to update..."
echo ""

# API routes
for file in app/api/**/*.ts; do
    update_file "$file"
done

# Private pages
for file in app/\(private\)/**/*.tsx; do
    update_file "$file"
done

# Server actions
for file in server/actions/*.ts; do
    update_file "$file"
done

# Client components
for file in components/**/*.tsx; do
    update_file "$file"
done

# Public pages
for file in app/\[locale\]/\(public\)/**/*.tsx; do
    update_file "$file"
done

# Hooks
for file in lib/hooks/*.ts lib/hooks/*.tsx hooks/*.ts hooks/*.tsx; do
    update_file "$file"
done

# Utilities
for file in lib/**/*.ts; do
    update_file "$file"
done

echo ""
echo -e "${GREEN}✅ Migration complete!${NC}"
echo -e "${GREEN}📊 Files modified: $FILES_MODIFIED${NC}"
echo ""
echo "⚠️  Manual review required:"
echo "  1. Check backup files (*.backup) if anything looks wrong"
echo "  2. Run 'pnpm lint' to check for errors"
echo "  3. Test the application"
echo ""
echo "🧹 To clean up backup files:"
echo "  find . -name '*.backup' -delete"
echo ""
echo "📦 To remove Clerk from package.json:"
echo "  pnpm remove @clerk/nextjs @clerk/localizations"

