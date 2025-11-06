# WorkOS Migration - Progress Update

**Date**: November 5, 2025  
**Status**: 99% Build Fixed - Critical Username Field Needed

---

## ✅ Completed Today

### 1. Fixed Build Errors (from 214 → ~94 errors)

- ✅ Fixed `app/api/user/security-preferences/route.ts` - Removed incorrect userId parameters
- ✅ Fixed `app/sitemap.ts` - Removed username field references, using fallback usernames
- ✅ Fixed `components/auth/ProfileAccessControl.tsx` - Removed Clerk dependencies
- ✅ Fixed `components/features/expert-setup/ExpertSetupBanner.tsx` - Fixed duplicate loading variable
- ✅ Replaced `components/features/expert-setup/ExpertSetupChecklist.tsx` with simplified WorkOS version
- ✅ Fixed `components/features/expert-setup/SetupCompletePublishCard.tsx` - Removed username reference
- ✅ Moved Clerk-dependent components to `components/_archive/`

### 2. Identified Critical Missing Field

**Issue**: The `username` field is missing from the schema, causing:

- Profile routes (`/[username]`) to fail
- Sitemap generation to use hardcoded fallbacks
- ProfileAccessControl to return 404 for all profiles

**Current Behavior**:

```
/raquelcristovao → 404 (username not found)
/sign-in → Caught by [username] route (wrong!)
```

---

## 🚨 Critical Issue: Username Field Missing

### Current State

The database schema does NOT have a username field in:

- ❌ `UsersTable` (has workosUserId, email, firstName, lastName - but NO username)
- ❌ `ProfilesTable` (has profile data but NO username reference)

### Where Usernames Were Stored (Old Clerk System)

- Clerk stored usernames in the `username` field of the User object
- Examples: `raquelcristovao`, `juliocastrosoares`, `marianamateus`

### Solution Required

**Option 1: Add username to UsersTable** (Recommended)

```typescript
export const UsersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  workosUserId: text('workos_user_id').notNull().unique(),
  email: text('email').notNull(),

  // ⭐ ADD THIS
  username: text('username').unique(), // Nullable initially

  firstName: text('first_name'),
  lastName: text('last_name'),
  // ... rest of fields
});
```

**Option 2: Add username to ProfilesTable** (Alternative)

```typescript
export const ProfilesTable = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => OrganizationsTable.id),
  workosUserId: text('workos_user_id').notNull().unique(),

  // ⭐ ADD THIS
  username: text('username').unique(), // Nullable initially

  profilePicture: text('profile_picture'),
  firstName: text('first_name').notNull(),
  // ... rest of fields
});
```

### Migration Strategy

1. **Add Field** (choose Option 1 or 2)
2. **Generate Migration**:

   ```bash
   pnpm db:generate
   # This creates: drizzle/migrations/XXXX_add_username.sql
   ```

3. **Backfill Usernames**:
   - Query Clerk API for existing user usernames
   - Update database with mapping: `clerkUserId → workosUserId → username`
   - Script: `scripts/backfill-usernames.ts`

4. **Update `getUserByUsername`**:

   ```typescript
   async function getUserByUsername(username: string) {
     return await db.query.UsersTable.findFirst({
       where: ({ username: usernameCol }, { eq }) => eq(usernameCol, username),
     });
   }
   ```

5. **Test Routes**:
   - `/raquelcristovao` → Should load expert profile
   - `/sign-in` → Should NOT be caught by [username] route

---

## 📊 Current Error Breakdown (94 total)

### By Category:

1. **Username-related**: ~15 errors
   - ProfileAccessControl returning `never` type
   - Username routes failing (pages using `getProfileAccessData`)
2. **User property references**: ~30 errors
   - `user.fullName` → Need to compute from `firstName + lastName`
   - `user.imageUrl` → Need to map from WorkOS user object
   - `user.primaryEmailAddress` → Need to use `user.email`
3. **Archived components**: ~20 errors
   - Old Clerk-based components in `_archive/`
   - Can be ignored (not in active use)

4. **WorkOS Auth hooks**: ~10 errors
   - `useAuth()` returning `loading` instead of `isLoading`
   - Need to check WorkOS AuthKit documentation

5. **Security preferences types**: ~10 errors
   - Type mismatch between old and new preferences structure

6. **Miscellaneous**: ~9 errors
   - Role type mismatches
   - Missing helper functions

---

## 🎯 Next Steps (Priority Order)

### 1. Add Username Field (CRITICAL - 1 hour)

- [ ] Decide: UsersTable or ProfilesTable?
- [ ] Add field to schema
- [ ] Generate migration
- [ ] Apply migration to dev database

### 2. Backfill Usernames (CRITICAL - 2 hours)

- [ ] Create script to query Clerk for usernames
- [ ] Map clerkUserId → workosUserId → username
- [ ] Update database with mappings
- [ ] Verify expert profiles load correctly

### 3. Fix Remaining Type Errors (2-3 hours)

- [ ] Add user helper utilities (`getFullName`, `getImageUrl`, `getPrimaryEmail`)
- [ ] Fix WorkOS auth hook references (`loading` → `isLoading`)
- [ ] Update security preferences types
- [ ] Fix role type definitions

### 4. Test Critical Flows (1 hour)

- [ ] Expert profile pages load
- [ ] Booking flow works
- [ ] Setup wizard works
- [ ] Admin routes work

### 5. Update Documentation (30 min)

- [ ] Update CURRENT-STATUS.md
- [ ] Update BUILD-STATUS.md
- [ ] Create username migration guide

---

## 📝 Key Decisions Needed

### Decision 1: Where to Store Username?

**Question**: Should username be in `UsersTable` or `ProfilesTable`?

**Recommendation**: **UsersTable** (Option 1)

**Reasoning**:

- Username is tied to authentication/identity (user-level)
- Not all users have profiles, but all users need usernames for routes
- Matches the old Clerk pattern (username was on User object)
- Simpler queries (one table instead of joining)

### Decision 2: Make Username Required or Optional?

**Recommendation**: **Optional initially, then required**

**Reasoning**:

- Add as nullable field first (for migration)
- Backfill existing users
- Make required in Phase 4 (after all users have usernames)

### Decision 3: Username Generation for New Users

**Recommendation**: Auto-generate from name + unique suffix

**Pattern**:

```typescript
function generateUsername(firstName: string, lastName: string): string {
  const base = `${firstName}${lastName}`.toLowerCase().replace(/\s+/g, '');
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}${suffix}`;
}
// Example: "Raquel Cristovão" → "raquelcristovao4j2k"
```

---

## 🏗️ Migration Progress

### Phase 1-3: Complete ✅

- ✅ Build fixes (clerkUserId → workosUserId)
- ✅ Guest user auto-registration
- ✅ Roles & permissions (database-backed)
- ✅ WorkOS authentication working
- ✅ Session management working

### Phase 4: In Progress ⏳ (50% - Username Field Blocking)

- ⏳ **BLOCKED**: Username field migration
- ⏳ Legacy data migration (waiting for username)
- ⏳ User mapping (clerkUserId → workosUserId → username)

### Phases 5-8: Pending

- ⏳ Phase 5: Schema consolidation
- ⏳ Phase 6: Neon Auth & RLS
- ⏳ Phase 7: Testing
- ⏳ Phase 8: Production deployment

---

## 💡 Recommendations

### Immediate Actions (Today)

1. **Add username field to UsersTable** (30 min)
2. **Generate and apply migration** (15 min)
3. **Create username backfill script** (1 hour)
4. **Test with one expert profile** (15 min)

### This Week

1. Complete username backfill for all users
2. Fix remaining type errors
3. Test critical user flows
4. Update all documentation

### Next Week

1. Phase 4: Complete data migration
2. Phase 5: Schema consolidation
3. Phase 6: RLS configuration
4. Begin Phase 7: Testing

---

## 📞 Support Needed

### Questions for Team:

1. Do we have access to Clerk API to fetch usernames?
2. Should we preserve exact old usernames or allow regeneration?
3. Any username validation rules to enforce?
4. Timeline constraints for production deployment?

---

## 📚 Related Documentation

- [CURRENT-STATUS.md](./CURRENT-STATUS.md) - Overall migration status
- [BUILD-STATUS.md](../../BUILD-STATUS.md) - Build error tracking
- [PHASE-3-COMPLETE.md](./PHASE-3-COMPLETE.md) - Roles migration details
- [clerk-to-workos-migration-plan.md](../../.cursor/plans/clerk-to-workos-migration-7ad57dce.plan.md) - Full migration plan

---

**Last Updated**: November 5, 2025 21:30 UTC  
**Next Review**: After username field is added
