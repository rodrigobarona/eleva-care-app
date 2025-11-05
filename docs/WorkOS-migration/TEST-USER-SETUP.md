# Test User Setup - WorkOS Migration

## Overview

Successfully configured `rbarona@hey.com` as a test expert user with complete onboarding for testing Phase 3 WorkOS implementation.

## What Was Done

### 1. Database Setup ✅

Created and executed `scripts/setup-test-expert.ts` to:

- **Update User Role**: Set `role = 'expert_top'` in `users` table
- **Create Expert Setup Record**: All onboarding steps marked complete
  - ✅ Profile completed
  - ✅ Availability completed
  - ✅ Events completed
  - ✅ Identity completed
  - ✅ Payment completed
  - ✅ Google Account completed
  - ✅ Setup complete with timestamp
- **Create User Preferences**: Default security and UI preferences

**Result**:

```
Email:              rbarona@hey.com
Name:               Rodrigo Barona
Role:               expert_top
WorkOS User ID:     user_01K8QT17KX25XPHVQ4H1K0HTR7
Organization ID:    7b23eb21-1182-402e-ae4b-63060a296d04

All Setup Steps:    ✅ Complete
```

### 2. Setup Page Migration ✅

Updated `/app/(private)/setup/page.tsx` to use WorkOS:

**Changes**:

- ❌ Removed: `import { useUser } from '@clerk/nextjs'`
- ✅ Added: `import { checkExpertSetupStatus } from '@/server/actions/expert-setup-workos'`
- ✅ Simplified: Replaced Clerk auth checks with WorkOS server action (handles auth internally)
- ✅ Improved: Better loading state management

**Before**:

```tsx
const { isLoaded, user } = useUser();
// Manual auth checks everywhere
if (!isLoaded || !user) return;
```

**After**:

```tsx
const [isLoading, setIsLoading] = useState(true);
// Server action handles auth via requireAuth()
const result = await checkExpertSetupStatus();
```

## Testing Checklist

You can now test:

### 1. Setup Page Features

- [ ] Visit `/setup` page
- [ ] Verify all 6 steps show as complete ✅
- [ ] Check confetti animation plays on load
- [ ] Test "Complete" button behavior for each step

### 2. WorkOS Role System

```typescript
import { getUserRoles, hasRole } from '@/lib/integrations/workos/roles';

// Test role checking
const roles = await getUserRoles('user_01K8QT17KX25XPHVQ4H1K0HTR7');
console.log(roles.applicationRole); // Should be 'expert_top'

const isExpert = await hasRole('user_01K8QT17KX25XPHVQ4H1K0HTR7', 'expert_top');
console.log(isExpert); // Should be true
```

### 3. Expert Setup Actions

```typescript
import {
  checkExpertSetupStatus,
  markStepComplete,
  resetSetup,
} from '@/server/actions/expert-setup-workos';

// Check status
const status = await checkExpertSetupStatus();
console.log(status.isSetupComplete); // Should be true
console.log(status.setupStatus); // All true

// Test marking a step (optional)
await markStepComplete('profile'); // Should work

// Reset setup (if needed for testing)
await resetSetup(); // Resets all steps to false
```

### 4. User Preferences

```typescript
import { getUserPreferences, updateUserPreferences } from '@/lib/integrations/workos/preferences';

// Get preferences
const prefs = await getUserPreferences('user_01K8QT17KX25XPHVQ4H1K0HTR7');
console.log(prefs); // Default preferences

// Update preferences (optional)
await updateUserPreferences('user_01K8QT17KX25XPHVQ4H1K0HTR7', {
  theme: 'dark',
  emailNotifications: false,
});
```

## Verification Scripts

### Quick Database Check

```sql
-- Check user role
SELECT email, first_name, last_name, role
FROM users
WHERE email = 'rbarona@hey.com';

-- Check expert setup
SELECT * FROM expert_setup
WHERE workos_user_id = 'user_01K8QT17KX25XPHVQ4H1K0HTR7';

-- Check preferences
SELECT * FROM user_preferences
WHERE workos_user_id = 'user_01K8QT17KX25XPHVQ4H1K0HTR7';
```

### Re-run Setup Script

```bash
# If you need to reset or re-apply
pnpm tsx scripts/setup-test-expert.ts
```

## Known Limitations

### RLS Policies Not Applied Yet

⚠️ **Important**: RLS policies for `expert_setup` and `user_preferences` tables are defined but **not yet applied** to the database.

**Why**: Waiting for Phase 6 (Neon Auth & RLS Configuration)

**Impact**:

- Data access works but isn't row-level secured yet
- Any authenticated user could theoretically access any setup/preferences record
- Not a production risk since we're still in migration

**Will be applied in**: Phase 6 via `drizzle/migrations-manual/002_phase3_enable_rls.sql`

## Files Created/Modified

### Created Scripts

- `scripts/setup-test-expert.ts` - TypeScript setup script ✅
- `scripts/setup-test-expert.sql` - SQL setup script (alternative) ✅

### Modified Components

- `app/(private)/setup/page.tsx` - Migrated to WorkOS ✅

## Next Steps

1. ✅ Test the setup page with your user
2. ✅ Verify all steps show as complete
3. ✅ Test role-based access controls
4. ⏳ Continue to Phase 4: Legacy Data Migration

## Troubleshooting

### Setup page shows loading forever

- Check browser console for errors
- Verify `requireAuth()` is working in server action
- Check database connection

### Steps show as incomplete

- Run verification script to check database
- Re-run `pnpm tsx scripts/setup-test-expert.ts`
- Check for errors in server action

### Can't access setup page

- Ensure you're logged in with `rbarona@hey.com`
- Check route protection in middleware
- Verify WorkOS session is valid

## Summary

✅ **Database**: Test user configured with expert_top role and complete setup  
✅ **Setup Page**: Migrated from Clerk to WorkOS server actions  
✅ **Scripts**: Reusable setup scripts for future test users  
⏳ **RLS**: Policies defined, will be applied in Phase 6

**Ready for testing!** 🚀
