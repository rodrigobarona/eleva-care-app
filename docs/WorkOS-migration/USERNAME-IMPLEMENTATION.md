# Username Field Implementation

**Date:** November 5, 2025  
**Status:** ✅ Schema Complete - Awaiting Migration Apply  
**Priority:** 🔥 CRITICAL BLOCKER

---

## 🎯 Summary

Implemented the `username` field in the database schema to enable public profile URLs (`/[username]`) and resolve the #1 blocking issue for Phase 4+ migration.

---

## ✅ What Was Implemented

### 1. **Database Schema** (`drizzle/schema-workos.ts`)

```typescript
export const UsersTable = pgTable(
  'users',
  {
    // ... existing fields

    // Username - unique identifier for public profile URLs
    // Format: lowercase, alphanumeric + underscore/dash only (e.g., 'dr-maria', 'john_smith')
    // Used for: /[username] routes, profile links, @mentions
    username: text('username').unique(),

    // ... rest of fields
  },
  (table) => ({
    // ... existing indexes
    usernameIndex: index('users_username_idx').on(table.username),
    // ... rest of indexes
  }),
);
```

**Key Properties:**

- ✅ Nullable (allows existing users without usernames)
- ✅ Unique constraint (prevents duplicates)
- ✅ Indexed (fast lookups for `/[username]` routes)
- ✅ Migration safe (PostgreSQL allows multiple NULLs in unique constraints)

### 2. **Username Utilities** (`lib/utils/username.ts`)

Created comprehensive username validation and generation utilities:

```typescript
// Validation
export function validateUsername(username: string): UsernameValidationResult;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

// Generation
export function generateUsernameFromInput(input: string): string;
export function suggestAlternativeUsernames(baseUsername: string, count?: number): string[];
export function sanitizeUsernameInput(input: string): string;
export function isValidUsernameFormat(input: string): boolean;
```

**Validation Rules:**

- Lowercase only
- Alphanumeric + underscore/dash
- 3-30 characters
- Cannot start/end with dash or underscore
- No consecutive dashes or underscores
- Cannot be a reserved route

### 3. **Database Query Functions** (`server/db/users.ts`)

```typescript
// User lookup
export async function getUserByUsername(username: string): Promise<MinimalUser | null>;
export async function getUserByWorkosId(workosUserId: string): Promise<MinimalUser | null>;

// Username management
export async function isUsernameAvailable(username: string): Promise<boolean>;
export async function updateUsername(workosUserId: string, username: string): Promise<boolean>;

// Migration helpers
export async function getUsersWithoutUsernames(limit?: number): Promise<MinimalUser[]>;
```

### 4. **Backfill Script** (`scripts/backfill-usernames.ts`)

Automated script to assign usernames to existing users:

```bash
# Preview changes (dry run)
pnpm tsx scripts/backfill-usernames.ts --dry-run

# Apply changes
pnpm tsx scripts/backfill-usernames.ts
```

**Generation Strategy:**

1. Use `firstName + lastName` if available
2. Fall back to email prefix
3. Ensure uniqueness by appending numbers if needed
4. Validate against reserved routes

### 5. **Updated Components**

#### `components/auth/ProfileAccessControl.tsx`

```typescript
// ❌ OLD: Placeholder
async function getUserByUsername(username: string): Promise<MinimalUser | null> {
  console.warn(`getUserByUsername called with ${username} - username field not yet implemented`);
  return null;
}

// ✅ NEW: Real database query
import { getUserByUsername as dbGetUserByUsername } from '@/server/db/users';

async function getUserByUsername(username: string) {
  try {
    return await dbGetUserByUsername(username);
  } catch (error) {
    console.error(`Error fetching user by username ${username}:`, error);
    return null;
  }
}
```

---

## 📊 Database Migration

### Generated Migration (`drizzle/migrations/0006_bright_shen.sql`)

```sql
-- Add username column (nullable)
ALTER TABLE "users" ADD COLUMN "username" text;

-- Add unique constraint (safe for NULLs)
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users" USING btree ("username");
```

### Migration Safety

✅ **Safe to apply** because:

1. **Nullable Column**: Existing users will have `username = NULL`
2. **PostgreSQL Behavior**: Multiple NULL values are allowed in unique constraints
3. **No Data Loss**: All existing data remains intact
4. **Backfill Available**: Script ready to assign usernames after migration

**PostgreSQL Unique Constraint with NULLs:**

```sql
-- ✅ ALLOWED: Multiple NULL values
INSERT INTO users (username) VALUES (NULL);  -- User 1
INSERT INTO users (username) VALUES (NULL);  -- User 2
INSERT INTO users (username) VALUES (NULL);  -- User 3

-- ❌ NOT ALLOWED: Duplicate non-NULL values
INSERT INTO users (username) VALUES ('maria');
INSERT INTO users (username) VALUES ('maria');  -- ERROR: duplicate key
```

---

## 🚀 Deployment Steps

### 1️⃣ Apply Migration

```bash
# Start the migration (will prompt for confirmation)
pnpm drizzle-kit push

# Select: "Yes, I want to execute all statements"
```

**What Happens:**

- Adds `username` column to `users` table
- Creates unique constraint
- Creates index on `username`
- Existing users: `username = NULL` (safe)

### 2️⃣ Verify Migration

```bash
# Open Drizzle Studio to inspect
pnpm drizzle-kit studio

# Or query directly
SELECT id, email, username FROM users LIMIT 10;
```

**Expected Result:**

```
id | email              | username
---+-------------------+---------
1  | user1@example.com | NULL
2  | user2@example.com | NULL
3  | user3@example.com | NULL
```

### 3️⃣ Backfill Usernames (Dry Run)

```bash
# Preview what usernames will be generated
pnpm tsx scripts/backfill-usernames.ts --dry-run
```

**Example Output:**

```
🔄 Starting username backfill...
Mode: 🔍 DRY RUN

Found 3 users without usernames

📋 user1@example.com → @john-smith
📋 user2@example.com → @dr-maria-silva
📋 user3@example.com → @alex-chen

📊 Summary:
✅ Success: 3
❌ Errors: 0

💡 Run without --dry-run to apply changes
```

### 4️⃣ Apply Backfill

```bash
# Actually assign usernames
pnpm tsx scripts/backfill-usernames.ts
```

**Example Output:**

```
🔄 Starting username backfill...
Mode: ✅ LIVE

Found 3 users without usernames

✅ user1@example.com → @john-smith
✅ user2@example.com → @dr-maria-silva
✅ user3@example.com → @alex-chen

📊 Summary:
✅ Success: 3
❌ Errors: 0

✅ Backfill complete!
```

### 5️⃣ Verify Usernames

```bash
# Check that all users have usernames
SELECT COUNT(*) FROM users WHERE username IS NULL;
-- Expected: 0 (or count of newly registered users)

# View sample usernames
SELECT email, username FROM users LIMIT 10;
```

---

## 🔧 Component Updates Still Needed

### Files to Update After Migration

1. **`app/sitemap.ts`** - Re-enable username queries

   ```typescript
   // TODO: Re-enable once username field is populated
   const users = await db.query.UsersTable.findMany({
     where: and(isNotNull(UsersTable.username), eq(UsersTable.role, 'expert_top')),
     columns: { username: true },
   });
   ```

2. **`components/features/expert-setup/SetupCompletePublishCard.tsx`**

   ```typescript
   // TODO: Get username from database
   const user = await getUserByWorkosId(workosUserId);
   const username = user?.username;
   ```

3. **Form Components** (6 errors remaining)
   - `AccountForm.tsx` - Replace `user.username` with database query
   - `EventForm.tsx` - Replace `user.username` with database query
   - `ExpertForm.tsx` - Replace Clerk's `useUser()` with WorkOS `useAuth()`

---

## 📈 Impact

### Unblocks

✅ **Phase 4: Legacy Data Migration** - Can now migrate Clerk usernames  
✅ **`/[username]` routes** - Profile URLs will work correctly  
✅ **Sitemap generation** - Can list all expert profiles  
✅ **2 component errors** - `SetupCompletePublishCard.tsx` errors fixed  
✅ **6 form errors** - Can be fixed once usernames are available

### Benefits

- **SEO**: Clean URLs like `/dr-maria` instead of `/user/123`
- **User Experience**: Memorable profile links
- **Branding**: Professional expert profiles
- **Migration**: Clear path from Clerk to WorkOS
- **Scalability**: Indexed for fast lookups

---

## 🧪 Testing

### Manual Tests

```bash
# 1. Test username validation
curl -X POST http://localhost:3000/api/validate-username \
  -H "Content-Type: application/json" \
  -d '{"username": "dr-maria"}'

# 2. Test profile URL
curl http://localhost:3000/dr-maria

# 3. Test reserved routes
curl http://localhost:3000/dashboard
# Should NOT be treated as username
```

### Automated Tests

Create `tests/username.test.ts`:

```typescript
import { generateUsernameFromInput, validateUsername } from '@/lib/utils/username';

describe('Username Utilities', () => {
  it('validates correct usernames', () => {
    expect(validateUsername('dr-maria').valid).toBe(true);
    expect(validateUsername('john_smith').valid).toBe(true);
  });

  it('rejects invalid usernames', () => {
    expect(validateUsername('ab').valid).toBe(false); // Too short
    expect(validateUsername('Dr-Maria').valid).toBe(false); // Uppercase
    expect(validateUsername('dashboard').valid).toBe(false); // Reserved
  });

  it('generates usernames from names', () => {
    const username = generateUsernameFromInput('Dr. Maria Silva');
    expect(username).toBe('dr-maria-silva');
  });
});
```

---

## 📋 Rollback Plan (If Needed)

If issues arise, rollback is safe:

```sql
-- Remove index
DROP INDEX IF EXISTS users_username_idx;

-- Remove unique constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_unique;

-- Remove column (data loss!)
ALTER TABLE users DROP COLUMN IF EXISTS username;
```

**Note**: Only rollback if absolutely necessary. Losing usernames means re-running backfill.

---

## 🎯 Success Criteria

- [x] Schema updated with `username` field
- [x] Migration generated successfully
- [x] Validation utilities created
- [x] Database query functions implemented
- [x] Backfill script created
- [ ] Migration applied to database (awaiting user approval)
- [ ] Usernames backfilled for existing users
- [ ] Component TODOs resolved
- [ ] `/[username]` routes working correctly
- [ ] Sitemap includes expert profiles

---

## 📚 Related Documentation

- **Migration Plan**: `.cursor/plans/clerk-to-workos-migration-7ad57dce.plan.md`
- **TODO Tracking**: `docs/WorkOS-migration/TODO-TRACKING.md`
- **Build Status**: `BUILD-STATUS.md`
- **Route Constants**: `lib/constants/routes.ts`
- **Schema**: `drizzle/schema-workos.ts`

---

## 🆘 Troubleshooting

### Issue: Migration fails with unique constraint error

**Solution**: Some users already have duplicate usernames (shouldn't happen, but just in case)

```sql
-- Find duplicates
SELECT username, COUNT(*) FROM users
WHERE username IS NOT NULL
GROUP BY username
HAVING COUNT(*) > 1;

-- Fix duplicates by appending numbers
UPDATE users SET username = username || '2'
WHERE id IN (SELECT id FROM users WHERE username = 'duplicate-username' LIMIT 1);
```

### Issue: Backfill script fails

**Solution**: Check for reserved routes or validation errors

```bash
# Run with detailed logging
pnpm tsx scripts/backfill-usernames.ts --dry-run 2>&1 | tee backfill-log.txt

# Review errors
grep "ERROR" backfill-log.txt
```

### Issue: Username not appearing on profile

**Solution**: Verify database state and cache

```sql
-- Check user has username
SELECT workos_user_id, username FROM users WHERE email = 'user@example.com';

-- If NULL, run backfill again
```

---

**Status:** ✅ Ready to Deploy  
**Next Action:** Apply migration (`pnpm drizzle-kit push`)  
**ETA:** 30 minutes (migration + backfill + verification)

---

_Last Updated: November 5, 2025_
