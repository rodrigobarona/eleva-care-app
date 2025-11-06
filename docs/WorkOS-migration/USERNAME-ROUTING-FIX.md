# Username Routing Fix - Critical Issue Resolved

**Date:** November 5, 2025  
**Issue:** `/sign-in` and other reserved routes being caught by `[username]` dynamic route  
**Status:** ✅ Fixed

---

## 🚨 The Problem

### Symptom
When visiting `/sign-in`, the following errors occurred:

```
getUserByUsername called with sign-in - username field not yet implemented
[UserLayout] User not found for username: sign-in
Error: You are calling 'withAuth' on a route that isn't covered by the AuthKit middleware
```

### Root Cause
The dynamic route `app/[locale]/(public)/[username]/page.tsx` was catching ALL routes, including reserved routes like:
- `/sign-in`
- `/sign-up`
- `/about`
- `/admin`
- etc.

This happened because:
1. Next.js routes dynamic segments **before** static routes in some cases
2. The `[username]` route didn't have a reserved route check
3. The page was calling `withAuth()` indirectly through `getProfileAccessData()`

---

## ✅ The Solution

### 1. Added Reserved Routes List

```typescript
/**
 * Reserved routes that should NOT be treated as usernames
 * These routes have dedicated pages elsewhere in the app
 */
const RESERVED_ROUTES = [
  'sign-in',
  'sign-up',
  'sign-out',
  'auth',
  'api',
  'dashboard',
  'setup',
  'account',
  'appointments',
  'booking',
  'admin',
  'unauthorized',
  'onboarding',
  'about',
  'history',
  'legal',
  'trust',
  'services',
  'help',
  'contact',
  'community',
];
```

### 2. Added Early Exit in `UserLayout`

```typescript
export default async function UserLayout(props: PageProps) {
  const params = await props.params;
  const { username, locale } = params;

  // CRITICAL: Check if this is a reserved route
  if (RESERVED_ROUTES.includes(username.toLowerCase())) {
    console.log(`[UserLayout] Reserved route detected: ${username} - returning 404`);
    return notFound();
  }

  // ... rest of component
}
```

### 3. Added Check in `generateMetadata`

```typescript
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const { username, locale } = params;

  // Check if this is a reserved route - return default metadata
  if (RESERVED_ROUTES.includes(username.toLowerCase())) {
    return {
      title: 'Eleva Care',
      description: 'Mental health care platform',
    };
  }

  // ... rest of metadata generation
}
```

---

## 🔍 How It Works

### Request Flow (Before Fix)
```
User visits /sign-in
  ↓
Next.js matches [locale]/[username] route
  ↓
username = 'sign-in'
  ↓
Tries to fetch user profile for 'sign-in'
  ↓
Calls withAuth() on a public route
  ↓
ERROR: withAuth not covered by middleware
```

### Request Flow (After Fix)
```
User visits /sign-in
  ↓
Next.js matches [locale]/[username] route
  ↓
username = 'sign-in'
  ↓
UserLayout checks RESERVED_ROUTES
  ↓
'sign-in' found in reserved list
  ↓
Returns notFound() (404)
  ↓
Next.js falls through to app/(auth)/sign-in/page.tsx
  ↓
SUCCESS: Proper sign-in page loads
```

---

## 🎯 Why This Is Critical

### The Username Feature
The username feature is a **core part of the Eleva Care platform**:

**Public Profile URLs:**
```
https://eleva.care/dr-maria-silva
https://eleva.care/dr-joao-santos
https://eleva.care/en/dr-ana-costa
```

**Requirements:**
1. Each expert must have a **unique username**
2. Usernames are used for public profile pages
3. Usernames are used in booking URLs
4. Usernames appear in SEO/OG tags
5. Usernames are needed for sitemap generation

**Current Status:**
- ❌ Username field **NOT YET** in database schema
- ❌ `getUserByUsername()` returns null (placeholder)
- ❌ Sitemap generation stubbed out
- ✅ Reserved routes properly excluded
- ✅ Route matching works correctly

---

## 📋 TODO: Username Field Implementation

### Phase 5: Schema Consolidation (HIGH PRIORITY)

#### 1. Add Username to Schema

**File:** `drizzle/schema-workos.ts`

```typescript
export const UsersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  workosUserId: text('workos_user_id').notNull().unique(),
  email: text('email').notNull(),
  
  // ADD THIS:
  username: text('username').notNull().unique(),
  
  // ... rest of fields
}, (table) => ({
  workosUserIdIndex: index('users_workos_user_id_idx').on(table.workosUserId),
  emailIndex: index('users_email_idx').on(table.email),
  
  // ADD THIS:
  usernameIndex: index('users_username_idx').on(table.username),
}));
```

#### 2. Generate & Apply Migration

```bash
# Generate migration
pnpm db:generate

# Apply to development
pnpm db:migrate

# Verify
psql $DATABASE_DEV_URL -c "\d users"
```

#### 3. Implement `getUserByUsername()`

**File:** `components/auth/ProfileAccessControl.tsx`

```typescript
async function getUserByUsername(username: string): Promise<MinimalUser | null> {
  const user = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.username, username),
  });
  
  if (!user) return null;
  
  return {
    id: user.workosUserId,
    fullName: `${user.firstName} ${user.lastName}`,
    imageUrl: user.imageUrl,
    email: user.email,
  };
}
```

#### 4. Update Sitemap Generation

**File:** `app/sitemap.ts`

```typescript
async function getPublishedUsernames(): Promise<string[]> {
  const users = await db
    .select({ username: UsersTable.username })
    .from(UsersTable)
    .innerJoin(ProfilesTable, eq(ProfilesTable.workosUserId, UsersTable.workosUserId))
    .where(eq(ProfilesTable.published, true));
  
  return users.map(u => u.username);
}
```

#### 5. Backfill Usernames

**Migration Script:**

```typescript
// scripts/backfill-usernames.ts
async function backfillUsernames() {
  const users = await db.select().from(UsersTable);
  
  for (const user of users) {
    // Generate username from name or email
    const username = generateUsername(user.firstName, user.lastName, user.email);
    
    await db
      .update(UsersTable)
      .set({ username })
      .where(eq(UsersTable.id, user.id));
  }
}
```

---

## 🔒 Security Considerations

### Reserved Routes Protection

**Why It Matters:**
- Prevents route hijacking
- Protects admin routes
- Prevents API route conflicts
- Ensures authentication routes work

**Current Protection:**
```typescript
const RESERVED_ROUTES = [
  // Auth routes
  'sign-in', 'sign-up', 'sign-out', 'auth',
  
  // Admin routes
  'dashboard', 'setup', 'account', 'appointments', 'booking', 'admin',
  
  // Public routes
  'about', 'history', 'legal', 'trust', 'services', 'help', 'contact',
  
  // System routes
  'api', 'unauthorized', 'onboarding', 'community',
];
```

### Username Validation (Future)

```typescript
// When implementing username creation
function isValidUsername(username: string): boolean {
  // Check reserved routes
  if (RESERVED_ROUTES.includes(username.toLowerCase())) {
    return false;
  }
  
  // Check format (alphanumeric + hyphens/underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return false;
  }
  
  // Check length
  if (username.length < 3 || username.length > 30) {
    return false;
  }
  
  return true;
}
```

---

## 📊 Impact Analysis

### Files Modified
1. **`app/[locale]/(public)/[username]/page.tsx`**
   - Added `RESERVED_ROUTES` constant
   - Added early exit in `UserLayout`
   - Added check in `generateMetadata`
   - Removed `withAuth` import (no longer needed on public pages)

### Benefits
- ✅ `/sign-in` now works correctly
- ✅ All reserved routes protected
- ✅ No more `withAuth` errors on public routes
- ✅ Proper 404 handling for non-existent usernames
- ✅ SEO metadata works correctly

### Breaking Changes
- None (this is a bug fix, not a breaking change)

---

## 🧪 Testing Checklist

### Manual Testing
- [x] Visit `/sign-in` - Should load sign-in page
- [x] Visit `/sign-up` - Should load sign-up page
- [x] Visit `/about` - Should load about page
- [x] Visit `/dashboard` - Should redirect to sign-in if not authenticated
- [ ] Visit `/valid-username` - Should load user profile (once usernames exist)
- [ ] Visit `/invalid-username` - Should return 404

### Automated Testing (Future)
```typescript
// tests/routes/username-routing.test.ts
describe('[username] route', () => {
  test('rejects reserved routes', async () => {
    for (const route of RESERVED_ROUTES) {
      const response = await fetch(`http://localhost:3000/${route}`);
      expect(response.status).not.toBe(200);
    }
  });
  
  test('accepts valid usernames', async () => {
    const response = await fetch('http://localhost:3000/dr-maria-silva');
    expect(response.status).toBe(200);
  });
});
```

---

## 📝 Related Documentation

- **Migration Plan:** `.cursor/plans/clerk-to-workos-migration-7ad57dce.plan.md`
- **TODO Tracking:** `docs/WorkOS-migration/TODO-TRACKING.md`
- **Build Status:** `BUILD-STATUS.md`
- **Proxy Migration:** `docs/WorkOS-migration/NEXT-JS-16-PROXY-MIGRATION.md`

---

## 🎯 Next Steps

### Immediate (This Week)
1. ✅ Fix reserved routes (DONE)
2. [ ] Add username field to schema
3. [ ] Implement `getUserByUsername()`
4. [ ] Update sitemap generation
5. [ ] Backfill existing usernames

### Phase 5 (Next 2 Weeks)
1. [ ] Complete username implementation
2. [ ] Add username validation
3. [ ] Create username claim/reservation system
4. [ ] Add username change functionality
5. [ ] Update all profile links to use usernames

---

**Status:** ✅ Reserved routes issue fixed  
**Next Action:** Add `username` field to database schema  
**Priority:** 🚨 HIGH - Blocks profile URL functionality

---

*Last Updated: November 5, 2025*

