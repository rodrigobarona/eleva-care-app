# Test Migration Plan: Clerk → WorkOS

**Date**: 2025-11-06  
**Status**: 📋 Planning Phase  
**Total Tests**: 33 test files  
**Estimated Time**: 8-12 hours  
**Priority**: HIGH (blocking production test suite)

---

## Executive Summary

Migration strategy to update all test files from Clerk authentication/authorization to WorkOS AuthKit. This includes:

- Replacing Clerk mocks with WorkOS mocks
- Updating authentication assertions
- Fixing schema mismatches (orgId requirements)
- Removing deprecated Clerk-specific tests
- Updating test utilities and helpers

---

## Current State Analysis

### Test Files by Status

| Category                  | Count | Status          |
| ------------------------- | ----- | --------------- |
| **Deprecated (Delete)**   | 3     | Ready to remove |
| **Core Setup (Critical)** | 2     | High priority   |
| **Integration Tests**     | 9     | Medium priority |
| **Server Action Tests**   | 4     | High priority   |
| **API Tests**             | 8     | Medium priority |
| **Library Tests**         | 7     | Low priority    |
| **Component Tests**       | 2     | Low priority    |

**Total**: 35 files (including setup/mocks)

---

## Migration Phases

### Phase 1: Core Foundation (2-3 hours)

**Goal**: Fix test infrastructure and mocks

### Phase 2: Critical Server Actions (2-3 hours)

**Goal**: Fix server-side business logic tests

### Phase 3: API & Integration Tests (3-4 hours)

**Goal**: Fix API routes and integration flows

### Phase 4: Library & Component Tests (1-2 hours)

**Goal**: Fix utility and UI component tests

### Phase 5: Cleanup & Verification (1 hour)

**Goal**: Remove deprecated tests, run full suite

---

## Detailed Task Breakdown

## 🔴 Phase 1: Core Foundation (CRITICAL)

### 1.1 Fix WorkOS Mock Types in tests/setup.ts

**File**: `tests/setup.ts`  
**Issue**: `withAuth` mock type mismatch (line 261)  
**Estimated Time**: 30 minutes

**Tasks**:

- [ ] Read WorkOS AuthKit actual return type from `@workos-inc/authkit-nextjs`
- [ ] Fix `withAuth` mock to return proper structure
- [ ] Add `getSession`, `getSignInUrl`, `getSignUpUrl` mocks
- [ ] Update global mock types (remove `clerkUser`, `clerkUsers`)
- [ ] Add proper TypeScript types for WorkOS mocks

**Expected Structure**:

```typescript
jest.mock('@workos-inc/authkit-nextjs', () => ({
  withAuth: jest.fn().mockResolvedValue({
    user: {
      id: 'user_123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    sessionId: 'session_123',
    accessToken: 'mock_access_token',
    organizationId: 'org_123', // Important for org-scoped tests
  }),
  getSession: jest.fn(),
  getSignInUrl: jest.fn().mockReturnValue('/sign-in'),
  getSignUpUrl: jest.fn().mockReturnValue('/sign-up'),
  getSignOutUrl: jest.fn().mockReturnValue('/sign-out'),
}));
```

### 1.2 Delete Clerk Mock Directory

**File**: `tests/__mocks__/@clerk/nextjs/server.ts`  
**Estimated Time**: 5 minutes

**Tasks**:

- [ ] Delete `tests/__mocks__/@clerk/` directory entirely
- [ ] Verify no other files reference this mock

### 1.3 Create WorkOS Test Utilities

**File**: `tests/__mocks__/@workos-inc/authkit-nextjs.ts` (NEW)  
**Estimated Time**: 45 minutes

**Tasks**:

- [ ] Create proper WorkOS mock module
- [ ] Export mock functions: `withAuth`, `getSession`, etc.
- [ ] Add test helpers: `mockAuthenticatedUser()`, `mockUnauthenticatedUser()`
- [ ] Add organization helpers: `mockUserOrg()`, `mockOrgMembership()`
- [ ] Document usage in comments

**Template**:

```typescript
// tests/__mocks__/@workos-inc/authkit-nextjs.ts
import { jest } from '@jest/globals';

export const mockUser = {
  id: 'user_test123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockOrganization = {
  id: 'org_test123',
  name: 'Test Organization',
  slug: 'test-org',
};

export const withAuth = jest.fn().mockResolvedValue({
  user: mockUser,
  sessionId: 'session_test123',
  accessToken: 'mock_access_token',
  organizationId: mockOrganization.id,
  organization: mockOrganization,
});

export const getSession = jest.fn();
export const getSignInUrl = jest.fn().mockReturnValue('/sign-in');
export const getSignUpUrl = jest.fn().mockReturnValue('/sign-up');
export const getSignOutUrl = jest.fn().mockReturnValue('/sign-out');

// Test utilities
export const mockAuthenticatedUser = (overrides = {}) => {
  withAuth.mockResolvedValueOnce({
    user: { ...mockUser, ...overrides },
    sessionId: 'session_test123',
    accessToken: 'mock_access_token',
    organizationId: mockOrganization.id,
    organization: mockOrganization,
  });
};

export const mockUnauthenticatedUser = () => {
  withAuth.mockResolvedValueOnce({
    user: null,
    sessionId: null,
    accessToken: null,
    organizationId: null,
    organization: null,
  });
};
```

---

## 🟡 Phase 2: Critical Server Actions (HIGH PRIORITY)

### 2.1 Fix tests/server/actions/expert-profile.test.ts

**Estimated Time**: 30 minutes

**Issues**:

- Clerk imports and authentication
- Role checks using old role names
- Schema mismatches (orgId)

**Tasks**:

- [ ] Replace Clerk auth with WorkOS `withAuth`
- [ ] Update role assertions (`'expert_community'` vs `'community_expert'`)
- [ ] Add `orgId` to mock data where required
- [ ] Update user ID references (`clerkUserId` → `workosUserId`)
- [ ] Fix database query expectations

### 2.2 Fix tests/server/actions/meetings.test.ts

**Estimated Time**: 45 minutes

**Issues**:

- Schema mismatch: `orgId` missing in mock data
- `stripeRefundId` property doesn't exist in schema

**Tasks**:

- [ ] Add `orgId` to all mock events and meetings
- [ ] Remove `stripeRefundId` from mock data (not in schema)
- [ ] Update WorkOS user ID references
- [ ] Fix profile access (now in separate ProfilesTable)
- [ ] Update `firstName`/`lastName` access pattern

### 2.3 Fix tests/server/actions/stripe.test.ts

**Estimated Time**: 30 minutes

**Tasks**:

- [ ] Replace Clerk auth mocks
- [ ] Update Stripe Connect account ID references
- [ ] Add `orgId` to mock data
- [ ] Update user metadata access patterns

### 2.4 Fix tests/server/actions/events.test.ts

**Estimated Time**: 30 minutes

**Tasks**:

- [ ] Replace Clerk auth mocks
- [ ] Add `orgId` to mock events
- [ ] Update `workosUserId` references
- [ ] Fix event creation/update assertions

---

## 🟢 Phase 3: API & Integration Tests (MEDIUM PRIORITY)

### 3.1 Delete Deprecated Clerk Tests

**Estimated Time**: 10 minutes

**Files to Delete**:

- [ ] `tests/api/webhooks/clerk.test.ts` - Clerk webhook handler (no longer used)
- [ ] `tests/deprecated/check-kv-sync.test.ts` - Clerk + Upstash KV sync (deprecated)
- [ ] `tests/deprecated/expert-setup.test.ts` - Old Clerk expert setup (deprecated)
- [ ] `tests/lib/clerk-cache.test.ts` - Clerk cache utilities (no longer exists)

### 3.2 Fix tests/api/webhooks/stripe-identity.test.ts

**Estimated Time**: 20 minutes

**Issues**:

- Wrong import: `markStepCompleteForUser` should be `markStepComplete`

**Tasks**:

- [ ] Fix import from `@/server/actions/expert-setup`
- [ ] Update function call: `markStepComplete(userId, 'identityCompleted')`
- [ ] Add `orgId` if schema requires it

### 3.3 Fix tests/api/webhooks/stripe-connect.test.ts

**Estimated Time**: 30 minutes

**Tasks**:

- [ ] Update Stripe Connect account creation flow
- [ ] Fix user lookup (WorkOS user ID)
- [ ] Add `orgId` to database operations
- [ ] Update expert setup step completion

### 3.4 Fix tests/api/webhooks/blocked-date-refund.test.ts

**Estimated Time**: 20 minutes

**Tasks**:

- [ ] Update user authentication checks
- [ ] Fix blocked date queries (workosUserId)
- [ ] Add `orgId` scoping

### 3.5 Fix tests/api/create-payment-intent.test.ts

**Estimated Time**: 30 minutes

**Tasks**:

- [ ] Replace Clerk session checks
- [ ] Update Stripe customer ID lookup
- [ ] Fix user profile access
- [ ] Add `orgId` to meeting/event queries

### 3.6 Fix tests/integration/services/security.test.ts

**Estimated Time**: 30 minutes

**Issues**:

- Cannot find `@/lib/integrations/clerk/security-utils` (deleted)

**Tasks**:

- [ ] Determine if test is still relevant (may need complete rewrite)
- [ ] Replace with WorkOS security patterns
- [ ] Or delete if security utils no longer exist

### 3.7 Fix tests/integration/availability-management.test.ts

**Estimated Time**: 45 minutes

**Tasks**:

- [ ] Replace Clerk user creation with WorkOS patterns
- [ ] Update schedule creation (workosUserId)
- [ ] Add `orgId` to schedules and availabilities
- [ ] Fix availability queries

### 3.8 Fix tests/integration/expert-onboarding.test.ts

**Estimated Time**: 45 minutes

**Tasks**:

- [ ] Replace Clerk onboarding flow
- [ ] Update expert setup checks (workosUserId)
- [ ] Add `orgId` to profile and setup records
- [ ] Fix role assignment tests

### 3.9 Fix tests/integration/novu-workflow-execution.test.ts

**Estimated Time**: 20 minutes

**Tasks**:

- [ ] Update user references (workosUserId)
- [ ] Fix notification workflow triggers
- [ ] Update subscriber ID format

---

## 🔵 Phase 4: Library & Component Tests (LOW PRIORITY)

### 4.1 Fix tests/lib/transfer-utils.test.ts

**Estimated Time**: 30 minutes

**Issues**:

- Multiple type errors with Stripe mock data

**Tasks**:

- [ ] Fix Stripe transfer mock types
- [ ] Update payment intent mock structure
- [ ] Fix `expertClerkUserId` → `workosUserId` in PaymentTransfersTable
- [ ] Ensure mocks match actual Stripe response types

### 4.2 Fix tests/lib/audit-error-handling.test.ts

**Estimated Time**: 15 minutes

**Tasks**:

- [ ] Update user ID references
- [ ] Add `orgId` to audit log expectations
- [ ] Fix audit event action types (if any Clerk-specific)

### 4.3 Fix tests/lib/novu-workflow-fix.test.ts

**Estimated Time**: 15 minutes

**Tasks**:

- [ ] Update subscriber ID format (WorkOS user IDs)
- [ ] Fix workflow trigger assertions

### 4.4 Fix tests/components/MeetingForm.test.tsx

**Estimated Time**: 20 minutes

**Tasks**:

- [ ] Update authentication context
- [ ] Fix user prop types
- [ ] Update event/meeting data structure

### 4.5 Fix tests/components/ProfilePublishToggle.test.tsx

**Estimated Time**: 20 minutes

**Tasks**:

- [ ] Update user authentication
- [ ] Fix profile data structure
- [ ] Add `orgId` if component expects it

---

## Phase 5: Cleanup & Verification (FINAL)

### 5.1 Update Test Utilities and Mocks

**Estimated Time**: 30 minutes

**Files**:

- [ ] `tests/integration/expert-setup-mocks.ts` - Update mock factories
- [ ] `tests/mocks/email-service.ts` - Verify user references
- [ ] `tests/mocks.d.ts` - Update type declarations

### 5.2 Update Test Documentation

**Estimated Time**: 20 minutes

**Tasks**:

- [ ] Update `tests/TEST_COVERAGE_REPORT.md`
- [ ] Document WorkOS test patterns
- [ ] Add examples for common test scenarios

### 5.3 Run Full Test Suite

**Estimated Time**: 10 minutes

**Tasks**:

- [ ] Run `pnpm test` and verify all pass
- [ ] Check for any remaining Clerk references
- [ ] Verify test coverage hasn't decreased

---

## Common Migration Patterns

### Pattern 1: Replace Clerk Auth in Server Actions

**Before (Clerk)**:

```typescript
import { auth } from '@clerk/nextjs/server';

const { userId } = await auth();
if (!userId) throw new Error('Unauthorized');
```

**After (WorkOS)**:

```typescript
import { withAuth } from '@workos-inc/authkit-nextjs';

const { user } = await withAuth();
if (!user || !user.id) throw new Error('Unauthorized');
const userId = user.id; // workosUserId
```

### Pattern 2: Update Schema References

**Before**:

```typescript
const event = {
  id: 'event_123',
  clerkUserId: 'user_123',
  name: 'Test Event',
  // ... no orgId
};
```

**After**:

```typescript
const event = {
  id: 'event_123',
  workosUserId: 'user_workos123',
  orgId: 'org_123', // NOW REQUIRED
  name: 'Test Event',
};
```

### Pattern 3: Access User Name Data

**Before (Clerk)**:

```typescript
const user = await currentUser();
const name = `${user.firstName} ${user.lastName}`;
```

**After (WorkOS)**:

```typescript
const { user } = await withAuth();
// Fetch profile from database
const profile = await db.query.ProfilesTable.findFirst({
  where: eq(ProfilesTable.workosUserId, user.id),
});
const name = `${profile?.firstName} ${profile?.lastName}`;
```

### Pattern 4: Mock Authenticated Requests

**Before (Clerk)**:

```typescript
auth.mockReturnValue({ userId: 'user_123' });
```

**After (WorkOS)**:

```typescript
withAuth.mockResolvedValue({
  user: {
    id: 'user_test123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    emailVerified: true,
  },
  sessionId: 'session_test123',
  organizationId: 'org_test123',
});
```

---

## Testing Checklist

After each phase, verify:

- [ ] No TypeScript errors in test files
- [ ] Tests compile without import errors
- [ ] Mock functions return correct types
- [ ] Database queries use correct column names
- [ ] `orgId` included where schema requires it
- [ ] User IDs use `workosUserId` not `clerkUserId`
- [ ] Profile data accessed from ProfilesTable
- [ ] Authentication flows use WorkOS patterns

---

## Risk Assessment

### High Risk (Requires Careful Review)

- **Authentication flows**: Ensure security isn't compromised
- **Payment processing**: Stripe integration must remain intact
- **User data access**: Privacy/HIPAA compliance maintained

### Medium Risk

- **Schema changes**: orgId requirements may break existing tests
- **Mock data**: Incomplete mocks could cause runtime errors

### Low Risk

- **Deprecated tests**: Safe to delete
- **Test utilities**: Can be rebuilt incrementally

---

## Success Criteria

- [ ] All tests pass (`pnpm test` exits with 0)
- [ ] Zero TypeScript errors in test files
- [ ] No Clerk imports remaining
- [ ] Test coverage at least 80% (current baseline)
- [ ] No deprecated test files remaining
- [ ] Documentation updated

---

## Estimated Timeline

| Phase                         | Time           | Status             |
| ----------------------------- | -------------- | ------------------ |
| Phase 1: Core Foundation      | 2-3 hours      | 🔴 Not Started     |
| Phase 2: Server Actions       | 2-3 hours      | 🔴 Not Started     |
| Phase 3: API & Integration    | 3-4 hours      | 🔴 Not Started     |
| Phase 4: Library & Components | 1-2 hours      | 🔴 Not Started     |
| Phase 5: Cleanup              | 1 hour         | 🔴 Not Started     |
| **Total**                     | **9-13 hours** | **🔴 Not Started** |

---

## Next Steps

1. **Review this plan** with team
2. **Start with Phase 1** (core foundation)
3. **Commit after each phase** (incremental progress)
4. **Run tests frequently** to catch regressions early
5. **Document any unexpected issues** for future reference

---

**Ready to begin migration? Start with Phase 1, Task 1.1: Fix WorkOS Mock Types** 🚀
