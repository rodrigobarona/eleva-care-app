# Phase 3 Completion Plan: Fix Private Section for WorkOS

**Created**: November 5, 2025
**Status**: Phase 3 Section 3.5 INCOMPLETE - Critical Gap Identified

## 🚨 Current Problem

Phase 3 was marked complete, but **Section 3.5 (Update Dashboard & Protected Routes)** is incomplete. The entire `(private)` section still uses Clerk:

### Files Still Using Clerk:

1. ✅ **app/(private)/layout.tsx** - Uses `auth()` from Clerk
2. ✅ **app/(private)/dashboard/page.tsx** - Uses `currentUser()` and metadata
3. ✅ **app/(private)/booking/events/page.tsx** - Uses Clerk user fetching
4. ❌ **Multiple other private pages** - Need assessment

### Impact:

- ❌ Cannot access private area with WorkOS credentials
- ❌ Cannot create events to test guest booking flow
- ❌ MeetingForm.tsx cannot be tested end-to-end
- ❌ Phase 3 is NOT truly complete

---

## 🎯 Strategic Decision: Fix vs Workaround

### Option A: SQL Workaround (NOT RECOMMENDED)

**Approach**: Insert test event directly via SQL

```sql
INSERT INTO events (...) VALUES (...);
```

**Pros**:

- Quick (5 minutes)
- Can test guest booking immediately

**Cons**:

- Doesn't fix root problem
- Phase 3 still incomplete
- Technical debt accumulates
- Will need to fix eventually anyway
- Not proper engineering

### Option B: Fix Private Section (RECOMMENDED) ✅

**Approach**: Complete Phase 3 Section 3.5 properly

**Pros**:

- Proper solution
- No technical debt
- Full testing capability
- Phase 3 truly complete
- Professional approach

**Cons**:

- Takes 2-3 hours
- More files to update

---

## 📋 Recommended Plan: Complete Phase 3.5

### Scope: Minimum Viable Fix

Focus on **3 core files** needed to create events and test:

1. `app/(private)/layout.tsx` - Auth guard
2. `app/(private)/dashboard/page.tsx` - Dashboard display
3. `app/(private)/booking/events/page.tsx` - Event creation/listing

### Time Estimate: 2-3 hours

---

## 🔧 Implementation Steps

### Step 1: Fix Private Layout (30 min)

**File**: `app/(private)/layout.tsx`

**Current** (Clerk):

```typescript
import { auth } from '@clerk/nextjs/server';

const { userId } = await auth();
if (!userId) {
  redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);
}
```

**New** (WorkOS):

```typescript
import { requireAuth } from '@/lib/auth/workos-session';

const session = await requireAuth(); // Auto-redirects if not authenticated
// Now have: session.userId, session.organizationId
```

**Changes**:

- Remove Clerk import
- Add WorkOS requireAuth import
- Simplify auth check (auto-redirects)
- Pass session data to sidebar if needed

---

### Step 2: Fix Dashboard Page (45 min)

**File**: `app/(private)/dashboard/page.tsx`

**Current Issues**:

- Uses `currentUser()` from Clerk (lines 7, 14)
- Accesses `user.publicMetadata.role` (line 25-26)
- Accesses `user.unsafeMetadata.expertSetup` (line 34)
- Accesses `user.firstName` (line 22)

**New Approach** (WorkOS + Database):

```typescript
import { requireAuth } from '@/lib/auth/workos-session';
import { getUserRoles } from '@/lib/integrations/workos/roles';
import { checkExpertSetupStatus } from '@/server/actions/expert-setup-workos';

export default async function HomePage() {
  const session = await requireAuth();

  // Parallel fetch from database
  const [user, roles, setupStatus] = await Promise.all([
    db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, session.userId),
      columns: { firstName, role: true },
    }),
    getUserRoles(session.userId),
    checkExpertSetupStatus(),
  ]);

  const firstName = user?.firstName || 'there';
  const isExpert = roles.some((r) => r.includes('expert'));
  const isSetupCompleted = setupStatus.isSetupComplete;

  // ... rest of component
}
```

**Changes**:

- Remove all Clerk imports
- Use WorkOS session
- Fetch user from database
- Use role utilities
- Use setup status from database

---

### Step 3: Fix Events Page (45 min)

**File**: `app/(private)/booking/events/page.tsx`

**Current Issues**:

- Uses `auth()` from Clerk (line 4, 10)
- Creates Clerk client (line 16-18)
- Fetches user via Clerk API (line 19)

**New Approach**:

```typescript
import { requireAuth } from '@/lib/auth/workos-session';

export default async function EventsPage() {
  const session = await requireAuth();

  // Get user from database
  const user = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.workosUserId, session.userId),
    columns: { username: true }
  });

  const username = user?.username || session.userId;

  // Fetch events (already using workosUserId - correct!)
  const events = await db.query.EventsTable.findMany({
    where: eq(EventsTable.workosUserId, session.userId),
    orderBy: asc(EventsTable.order)
  });

  // Mark step complete (already uses WorkOS action)
  if (events.some(e => e.isActive)) {
    await markStepCompleteNoRevalidate('events');
  }

  return <EventsList initialEvents={events} username={username} />;
}
```

**Changes**:

- Remove Clerk auth
- Remove Clerk client creation
- Fetch user from database
- Keep existing event fetching (already correct)

---

### Step 4: Test Event Creation Flow (30 min)

**Test Steps**:

1. ✅ Sign in with rbarona@hey.com via WorkOS
2. ✅ Access dashboard (should load with database data)
3. ✅ Navigate to /booking/events
4. ✅ Create a new event
5. ✅ Verify event appears in list
6. ✅ Get public booking URL

**Success Criteria**:

- Dashboard loads without errors
- User data displays correctly
- Can create new event
- Event saved to database
- Booking URL accessible

---

### Step 5: Test Guest Booking Flow (30 min)

**Test Steps**:

1. ✅ Open event booking URL (public)
2. ✅ Select date and time
3. ✅ Fill guest information
4. ✅ Submit booking (free event)
5. ✅ Verify guest user created in WorkOS
6. ✅ Verify guest org created
7. ✅ Verify meeting stored with guestWorkosUserId
8. ✅ Verify magic code email sent

**Database Checks**:

```sql
-- Check guest user created
SELECT * FROM users WHERE email = 'test-guest@example.com';

-- Check guest org created
SELECT * FROM organizations WHERE name LIKE '%test-guest%';

-- Check meeting has guest IDs
SELECT id, guest_workos_user_id, guest_org_id
FROM meetings
WHERE guest_email = 'test-guest@example.com';
```

**Success Criteria**:

- Guest auto-registered in WorkOS
- Personal org created
- Meeting saved with guest IDs
- Magic code email delivered
- No errors in logs

---

## 📊 Files to Update

### Critical (Must Fix):

- [ ] `app/(private)/layout.tsx` - Auth guard
- [ ] `app/(private)/dashboard/page.tsx` - Dashboard
- [ ] `app/(private)/booking/events/page.tsx` - Events list

### Important (Phase 3.5 Complete):

- [ ] `app/(private)/setup/page.tsx` - Already done ✅
- [ ] `app/(private)/appointments/page.tsx` - Defer to Phase 4
- [ ] `app/(private)/account/page.tsx` - Defer to Phase 4
- [ ] Other private pages - Defer to Phase 4

### Supporting:

- [ ] `components/layout/sidebar/AppSidebar.tsx` - May need user data
- [ ] Auth utilities already created ✅

---

## 🎯 Success Criteria

### Phase 3.5 Complete When:

- [x] Private layout uses WorkOS auth
- [x] Dashboard displays database data
- [x] Can create events via UI
- [x] Events page lists correctly
- [x] Test user can access all sections
- [x] Guest booking flow works end-to-end
- [x] No Clerk dependencies in core private files

### Phase 3 Truly Complete When:

- [x] All Phase 3.5 tasks done
- [x] Test event created
- [x] Guest booking tested
- [x] Documentation updated
- [x] Ready for Phase 4

---

## 🚀 Next Steps

1. **Approve this plan**
2. **Fix 3 core files** (layout, dashboard, events)
3. **Test event creation**
4. **Test guest booking**
5. **Mark Phase 3.5 complete**
6. **Update migration plan**
7. **Proceed to Phase 4**

---

## ⚠️ Important Notes

### Don't Skip This

- SQL workarounds create technical debt
- Phase 4 migration will fail without Phase 3 complete
- Testing must be done properly
- This is foundational work

### Why This Matters

- WorkOS session must work in private area
- Role system must work from database
- Setup tracking must work from database
- Guest user creation depends on expert events existing

### Time Investment

- 2-3 hours now saves days of debugging later
- Proper foundation = smooth Phase 4
- No shortcuts in critical migration

---

## 📝 Recommendation

**I strongly recommend Option B: Fix the private section properly.**

This is the right engineering approach:

1. Takes 2-3 hours (reasonable)
2. Completes Phase 3 properly
3. No technical debt
4. Full testing capability
5. Confidence for Phase 4

**Next**: If you approve, I'll start with Step 1 (layout.tsx) and work through systematically.

---

**Decision Required**:

- [ ] Option A: SQL workaround (not recommended)
- [ ] Option B: Fix private section properly (recommended)

**Your choice?**
