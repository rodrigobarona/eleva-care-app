# Test Migration Summary: Clerk → WorkOS

**Status**: 📋 PLAN READY  
**Priority**: 🔴 CRITICAL (Blocking production test suite)  
**Estimated Time**: 9-13 hours  
**Files Affected**: 33 test files + 2 setup files

---

## 🎯 Goal

Migrate all Jest/React Testing Library tests from Clerk authentication to WorkOS AuthKit, ensuring:

- ✅ All tests compile without errors
- ✅ All tests pass (`pnpm test` exits 0)
- ✅ No Clerk imports remain
- ✅ Test coverage maintained (≥80%)

---

## 📊 Migration Scope

| Category                | Files  | Priority    | Time      |
| ----------------------- | ------ | ----------- | --------- |
| **Core Setup**          | 2      | 🔴 Critical | 1-2h      |
| **Server Actions**      | 4      | 🔴 High     | 2-3h      |
| **API Tests**           | 8      | 🟡 Medium   | 2-3h      |
| **Integration Tests**   | 9      | 🟡 Medium   | 3-4h      |
| **Library Tests**       | 7      | 🟢 Low      | 1h        |
| **Components**          | 2      | 🟢 Low      | 30min     |
| **Deprecated (Delete)** | 4      | ⚪ Delete   | 10min     |
| **Total**               | **35** |             | **9-13h** |

---

## 🚀 Quick Start Guide

### Step 1: Read the Detailed Plan

```bash
open docs/WorkOS-migration/TEST-MIGRATION-PLAN.md
```

### Step 2: Start with Phase 1 (Core Foundation)

**File**: `tests/setup.ts` (line 261)

**Current Error**:

```typescript
Type error: Argument of type '{ user: { id: string; ... } }'
is not assignable to parameter of type 'never'.
```

**Fix**: Update `withAuth` mock to match WorkOS return type

### Step 3: Work Through Phases Sequentially

1. ✅ Phase 1: Fix core mocks → Run tests
2. ✅ Phase 2: Fix server actions → Run tests
3. ✅ Phase 3: Fix API/integration → Run tests
4. ✅ Phase 4: Fix library/components → Run tests
5. ✅ Phase 5: Cleanup and verify → Final test run

---

## 🔑 Key Changes Needed

### 1. Authentication Pattern

```typescript
// ❌ OLD (Clerk)
import { auth } from '@clerk/nextjs/server';
const { userId } = await auth();

// ✅ NEW (WorkOS)
import { withAuth } from '@workos-inc/authkit-nextjs';
const { user } = await withAuth();
const userId = user?.id;
```

### 2. User ID References

```typescript
// ❌ OLD
clerkUserId: 'user_123';

// ✅ NEW
workosUserId: 'user_test123';
```

### 3. Schema Updates

```typescript
// ❌ OLD (Missing orgId)
const event = {
  id: 'event_123',
  workosUserId: 'user_123',
};

// ✅ NEW (Add orgId)
const event = {
  id: 'event_123',
  workosUserId: 'user_123',
  orgId: 'org_123', // NOW REQUIRED
};
```

### 4. Profile Access

```typescript
// ❌ OLD (Direct from user)
const name = `${user.firstName} ${user.lastName}`;

// ✅ NEW (From ProfilesTable)
const profile = await db.query.ProfilesTable.findFirst({
  where: eq(ProfilesTable.workosUserId, user.id),
});
const name = `${profile?.firstName} ${profile?.lastName}`;
```

---

## 📝 Phase Breakdown

### 🔴 Phase 1: Core Foundation (1-2 hours)

**Critical**: Must be done first!

- [ ] Fix `tests/setup.ts` WorkOS mock types (30 min)
- [ ] Delete `tests/__mocks__/@clerk/` directory (5 min)
- [ ] Create `tests/__mocks__/@workos-inc/authkit-nextjs.ts` (45 min)

**Deliverable**: Test infrastructure compiles without errors

### 🔴 Phase 2: Server Actions (2-3 hours)

**High Priority**: Core business logic tests

- [ ] `tests/server/actions/expert-profile.test.ts` (30 min)
- [ ] `tests/server/actions/meetings.test.ts` (45 min) ⚠️ Schema issues
- [ ] `tests/server/actions/stripe.test.ts` (30 min)
- [ ] `tests/server/actions/events.test.ts` (30 min)

**Deliverable**: All server action tests pass

### 🟡 Phase 3: API & Integration (3-4 hours)

**Medium Priority**: API routes and integration flows

**First**: Delete 4 deprecated test files (10 min)

- `tests/api/webhooks/clerk.test.ts`
- `tests/deprecated/check-kv-sync.test.ts`
- `tests/deprecated/expert-setup.test.ts`
- `tests/lib/clerk-cache.test.ts`

**Then**: Fix remaining 9 API/integration tests (3-4 hours)

**Deliverable**: All API and integration tests pass

### 🟢 Phase 4: Library & Components (1-2 hours)

**Low Priority**: Utility and UI tests

- [ ] 5 library test files (1 hour)
- [ ] 2 component test files (30 min)

**Deliverable**: All library and component tests pass

### 🟢 Phase 5: Cleanup (1 hour)

**Final**: Verification and documentation

- [ ] Update test utilities (30 min)
- [ ] Update TEST_COVERAGE_REPORT.md (20 min)
- [ ] Full test suite verification (10 min)

**Deliverable**: `pnpm test` exits with 0, documentation updated

---

## ⚠️ Common Pitfalls

### 1. Forgetting `orgId`

**Error**: Schema requires `orgId` but mock data doesn't include it

```typescript
// ❌ Will fail
const event = { id: '123', workosUserId: 'user_123' };

// ✅ Correct
const event = { id: '123', workosUserId: 'user_123', orgId: 'org_123' };
```

### 2. Wrong Mock Return Type

**Error**: `withAuth` mock returns `{ userId }` instead of `{ user }`

```typescript
// ❌ Wrong
withAuth.mockResolvedValue({ userId: 'user_123' });

// ✅ Correct
withAuth.mockResolvedValue({
  user: { id: 'user_123', email: 'test@example.com' },
  sessionId: 'session_123',
  organizationId: 'org_123',
});
```

### 3. Accessing Removed Fields

**Error**: Trying to access `user.firstName` directly

```typescript
// ❌ Wrong (removed from UsersTable)
const name = user.firstName;

// ✅ Correct (from ProfilesTable)
const profile = await db.query.ProfilesTable.findFirst({
  where: eq(ProfilesTable.workosUserId, user.id),
});
const name = profile?.firstName;
```

---

## 🧪 Testing Strategy

### After Each Phase

```bash
# 1. Check for TypeScript errors
pnpm type-check

# 2. Run affected tests
pnpm test tests/server/actions

# 3. Check for Clerk references
grep -r "@clerk/nextjs" tests/

# 4. Verify no import errors
pnpm build
```

### Final Verification

```bash
# Run full suite
pnpm test

# Check coverage
pnpm test --coverage

# Verify no Clerk imports
grep -r "clerk" tests/ --exclude-dir=deprecated
```

---

## 📚 Resources

### Documentation

- **Detailed Plan**: `docs/WorkOS-migration/TEST-MIGRATION-PLAN.md`
- **TODO Tracking**: `docs/WorkOS-migration/TODO-TRACKING.md`
- **WorkOS Setup**: `docs/02-core-systems/WORKOS-AUTHENTICATION.md`

### Reference Files

- **Schema**: `drizzle/schema-workos.ts`
- **Auth Patterns**: `lib/auth/workos-helpers.ts`
- **Server Actions**: `server/actions/*.ts`

### Test Utilities

- **Setup**: `tests/setup.ts`
- **Mocks**: `tests/__mocks__/`
- **Mock Types**: `tests/mocks.d.ts`

---

## ✅ Success Criteria

Before marking as complete:

- [ ] `pnpm test` exits with code 0 (all tests pass)
- [ ] `pnpm type-check` shows 0 errors in test files
- [ ] No `@clerk/nextjs` imports in any test file
- [ ] No `tests/__mocks__/@clerk/` directory exists
- [ ] All deprecated test files deleted
- [ ] Test coverage at least 80% (baseline maintained)
- [ ] `TEST_COVERAGE_REPORT.md` updated
- [ ] WorkOS test patterns documented

---

## 🎯 Next Steps

### 1. Review the Plan

```bash
# Open detailed plan
open docs/WorkOS-migration/TEST-MIGRATION-PLAN.md
```

### 2. Start Phase 1

```bash
# Open first file to fix
code tests/setup.ts
```

### 3. Follow the Phases

Work through phases 1-5 sequentially, committing after each phase

### 4. Verify and Deploy

Run full test suite and verify all passes before deploying

---

## 🚨 Important Notes

1. **Work Sequentially**: Don't skip phases - each builds on the previous
2. **Commit Often**: Commit after each completed phase
3. **Run Tests Frequently**: Catch regressions early
4. **Ask for Help**: If stuck on a specific test, document it and move on
5. **Keep Coverage**: Don't delete tests unless truly deprecated

---

## 📊 Progress Tracking

Track your progress in the TODO list:

```bash
# View TODOs
cat docs/WorkOS-migration/TODO-TRACKING.md | grep "🧪 CRITICAL"

# Or use the project todo list
```

---

**Ready to start? Begin with Phase 1: Fix tests/setup.ts (line 261)** 🚀

**Estimated completion time**: 9-13 hours of focused work
