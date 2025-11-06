# Test Coverage Report & Development Roadmap

> **Last Updated**: November 6, 2025  
> **Total Test Suites**: 20+ passed  
> **Total Tests**: 200+ passed  
> **Execution Time**: ~6-8s  
> **Auth System**: ✅ Fully migrated to WorkOS

## 📊 Current Test Coverage Overview

### ✅ **Well-Covered Areas (95-100% Coverage)**

#### **Webhook Handlers**

- `tests/api/webhooks/stripe.test.ts` ↔ `app/api/webhooks/stripe/route.ts`
- `tests/api/webhooks/stripe-connect.test.ts` ↔ `app/api/webhooks/stripe-connect/route.ts`
- `tests/api/webhooks/stripe-identity.test.ts` ↔ `app/api/webhooks/stripe-identity/route.ts`
- ~~`tests/api/webhooks/clerk.test.ts`~~ → **Deprecated** (Clerk removed, migrated to WorkOS)

**Coverage Quality**: Excellent - includes error handling, edge cases, and comprehensive event processing

#### **Payment Processing**

- `tests/api/create-payment-intent.test.ts` ↔ Payment intent creation logic
- `tests/server/actions/stripe.test.ts` ↔ `server/actions/stripe.ts`

**Coverage Quality**: Comprehensive - covers payment flows, Stripe integration, and error scenarios

#### **Integration Services**

- `tests/integration/services/security.test.ts` - Enhanced security system
- `tests/integration/services/env-visibility.test.ts` - Environment variable management
- `tests/integration/services/og-images.test.ts` - OG image generation
- `tests/integration/novu-workflow-execution.test.ts` - Novu workflow testing

**Coverage Quality**: Good - covers service integrations and business logic

### ⚠️ **Partially Covered Areas (30-70% Coverage)**

#### **Server Actions** (33% Coverage)

**Covered**:

- `tests/server/actions/meetings.test.ts` ↔ `server/actions/meetings.ts`
- `tests/server/actions/expert-profile.test.ts` ↔ `server/actions/expert-profile.ts`
- `tests/server/actions/stripe.test.ts` ↔ `server/actions/stripe.ts`
- `tests/server/actions/events.test.ts` ↔ `server/actions/events.ts`

**Missing Coverage**: See [High Priority Tasks](#high-priority-tasks) below

#### **API Routes** (40% Coverage)

**Covered**:

- Webhook endpoints (comprehensive)
- Payment intent creation
- Time validation utilities

**Missing Coverage**: See [High Priority Tasks](#high-priority-tasks) below

### ❌ **Low Coverage Areas (<10% Coverage)**

#### **Components** (5% Coverage)

**Covered**:

- `tests/components/MeetingForm.test.tsx` ↔ Booking form component
- `tests/components/ProfilePublishToggle.test.tsx` ↔ Profile publishing
- `tests/components/emails/` ↔ Email template components

**Missing Coverage**: 95% of components lack tests

#### **Library Functions** (80% Coverage)

**Covered**:

- `tests/lib/formatters.test.ts` - Utility formatters
- `tests/lib/stripe.test.ts` - Stripe utilities
- `tests/lib/novu-workflow-fix.test.ts` - Novu workflow fixes
- `tests/lib/utils.test.ts` - General utilities

**Coverage Quality**: Good for covered utilities

## 🚨 **Skipped Tests (ESM Issues)**

The following tests are currently skipped due to ESM module compatibility issues:

```typescript
// In jest.config.ts - testPathIgnorePatterns:
'/tests/integration/services/redis.test.ts'; // uncrypto ESM issues
'/tests/integration/services/locale-detection.test.ts'; // next-intl ESM issues
'/tests/integration/services/keep-alive.test.ts'; // jose ESM issues
'/tests/integration/services/email.test.ts'; // mocking issues
```

**Resolution Status**: These require Jest ESM configuration updates or alternative testing approaches.

## 🎯 **Development Roadmap**

### **High Priority Tasks** (Critical Business Logic)

#### **1. Missing API Route Tests**

```typescript
// Priority 1 - Core System APIs
□ tests/api/diagnostics.test.ts              // System health monitoring
□ tests/api/healthcheck.test.ts              // Service availability
□ tests/api/categories.test.ts               // Category management
□ tests/api/admin/categories.test.ts         // Admin category operations

// Priority 2 - User Management APIs
□ tests/api/auth/user-authorization.test.ts  // User authorization
□ tests/api/user/profile.test.ts             // User profile management
□ tests/api/user/identity.test.ts            // Identity verification

// Priority 3 - System Integration APIs
□ tests/api/upload.test.ts                   // File upload handling
□ tests/api/scheduling-settings.test.ts     // Scheduling configuration
□ tests/api/qstash.test.ts                   // Queue management
□ tests/api/stripe/dashboard.test.ts         // Stripe dashboard
□ tests/api/novu.test.ts                     // Novu bridge endpoint
```

#### **2. Missing Server Action Tests**

```typescript
// Priority 1 - Core Business Logic
□ tests/server/actions/expert-setup.test.ts    // Expert onboarding flow
□ tests/server/actions/billing.test.ts         // Payment processing
□ tests/server/actions/user-sync.test.ts       // Data synchronization

// Priority 2 - Feature Management
□ tests/server/actions/blocked-dates.test.ts   // Calendar management
□ tests/server/actions/experts.test.ts         // Expert management
□ tests/server/actions/profile.test.ts         // Profile operations
□ tests/server/actions/schedule.test.ts        // Scheduling logic

// Priority 3 - System Maintenance
□ tests/server/actions/fixes.test.ts           // System fixes
```

### **Medium Priority Tasks** (User Experience)

#### **3. Critical Component Tests**

```typescript
// Priority 1 - Core User Interface
□ tests/components/organisms/ExpertSetupChecklist.test.tsx
□ tests/components/organisms/BookingLayout.test.tsx
□ tests/components/organisms/sidebar/AppSidebar.test.tsx

// Priority 2 - Form Components
□ tests/components/molecules/forms/EventForm.test.tsx
□ tests/components/molecules/forms/AvailabilityForm.test.tsx
□ tests/components/molecules/forms/ProfileForm.test.tsx

// Priority 3 - Navigation & Layout
□ tests/components/organisms/sidebar/NavMainContent.test.tsx
□ tests/components/organisms/category-list.test.tsx
□ tests/components/organisms/home/Hero.test.tsx
```

#### **4. Integration Test Fixes**

```typescript
// Resolve ESM Issues
□ Fix tests/integration/services/redis.test.ts
□ Fix tests/integration/services/locale-detection.test.ts
□ Fix tests/integration/services/keep-alive.test.ts
□ Fix tests/integration/services/email.test.ts

// Add Missing Integration Tests
□ tests/integration/expert-onboarding-flow.test.ts
□ tests/integration/payment-processing-flow.test.ts
□ tests/integration/calendar-integration.test.ts
```

### **Low Priority Tasks** (Enhancement)

#### **5. End-to-End Testing**

```typescript
// E2E Test Suite (Future)
□ tests/e2e/expert-registration.spec.ts
□ tests/e2e/booking-flow.spec.ts
□ tests/e2e/payment-processing.spec.ts
□ tests/e2e/admin-operations.spec.ts
```

#### **6. Performance & Load Testing**

```typescript
// Performance Tests (Future)
□ tests/performance/api-load.test.ts
□ tests/performance/database-queries.test.ts
□ tests/performance/webhook-processing.test.ts
```

## 📋 **Test Development Guidelines**

### **Jest Best Practices** (Following Context7 Standards)

#### **1. Test Structure**

```typescript
describe('ComponentName', () => {
  describe('given specific condition', () => {
    test('should perform expected behavior', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

#### **2. Mock Strategy**

```typescript
// Module-level mocking
jest.mock('@/lib/service', () => ({
  serviceFunction: jest.fn(),
}));

// Component-level mocking for external dependencies
const mockServiceFunction = jest.fn();
```

#### **3. Test Categories**

- **Unit Tests**: Individual functions and components
- **Integration Tests**: Service interactions and workflows
- **API Tests**: Endpoint behavior and error handling
- **Component Tests**: UI behavior and user interactions

### **File Naming Conventions**

```
tests/
├── api/                    # API endpoint tests
│   ├── [route-name].test.ts
│   └── webhooks/
├── server/                 # Server action tests
│   └── actions/
├── components/             # Component tests
│   ├── atoms/
│   ├── molecules/
│   └── organisms/
├── integration/            # Integration tests
│   └── services/
└── lib/                    # Utility function tests
```

### **Test Quality Standards**

#### **Required Test Coverage**

- ✅ **Happy Path**: Normal operation scenarios
- ✅ **Error Handling**: Exception and error scenarios
- ✅ **Edge Cases**: Boundary conditions and unusual inputs
- ✅ **Authentication**: Authorized and unauthorized access
- ✅ **Validation**: Input validation and sanitization

#### **Mock Requirements**

- 🔒 **External APIs**: Always mock (Stripe, WorkOS, Novu)
- 🗄️ **Database**: Mock for unit tests, real for integration
- 📧 **Email Services**: Mock unless testing email integration
- 🔐 **Authentication**: Mock WorkOS sessions and permissions

## 📈 **Progress Tracking**

### **Current Status**

- **Total Test Files**: 22
- **Passing Tests**: 205
- **Skipped Tests**: 4 (ESM issues)
- **Coverage Estimate**: ~60% of critical paths

### **Target Goals**

- **Q4 2025**: 80% API route coverage
- **Q1 2026**: 70% server action coverage
- **Q2 2026**: 50% component coverage
- **Q3 2026**: Resolve all ESM issues

### **Success Metrics**

- All critical business logic covered
- No skipped tests due to technical issues
- Test execution time under 15 seconds
- 95%+ test pass rate in CI/CD

## 🔧 **Technical Notes**

### **Jest Configuration**

- **Framework**: Jest with Next.js integration
- **Environment**: jsdom for component testing
- **Mocking**: Comprehensive mock setup in `tests/__mocks__/`
- **ESM Handling**: Ongoing challenges with some modules

### **Dependencies**

- **Testing Library**: React Testing Library for components
- **Mocking**: Jest mocks for external services
- **Assertions**: Jest matchers with custom extensions
- **Coverage**: Built-in Jest coverage reporting

### **CI/CD Integration**

- Tests run on every PR and push
- Coverage reports generated automatically
- Failed tests block deployment
- Performance regression detection

---

## 🔐 **WorkOS Authentication Patterns**

### **Overview**

All tests have been migrated from Clerk to WorkOS authentication. This section documents common patterns and best practices.

### **Migration Summary (Completed Nov 2025)**

#### **What Changed**

- **Old**: Clerk `clerkUserId`, `auth()`, `currentUser()`, `ClerkUser`
- **New**: WorkOS `workosUserId`, `withAuth()`, `UserInfo`, `User`

#### **Files Updated**

| Category            | Files Changed                                                                    | Status      |
| ------------------- | -------------------------------------------------------------------------------- | ----------- |
| **Core Mocks**      | `tests/setup.ts`, `tests/__mocks__/@workos-inc/`                                 | ✅ Complete |
| **Server Actions**  | `expert-profile.test.ts`, `meetings.test.ts`, `stripe.test.ts`, `events.test.ts` | ✅ Complete |
| **API Tests**       | `stripe-identity.test.ts`, `create-payment-intent.test.ts`                       | ✅ Complete |
| **Library Tests**   | `transfer-utils.test.ts`, `audit-error-handling.test.ts`                         | ✅ Complete |
| **Component Tests** | `MeetingForm.test.tsx`, `ProfilePublishToggle.test.tsx`                          | ✅ Complete |

### **Common Patterns**

#### **1. Mocking WorkOS Authentication**

**In `tests/setup.ts`** (Global Setup):

```typescript
import { mockUserInfo, mockWorkosUser } from '@/__mocks__/@workos-inc/authkit-nextjs';

jest.mock('@workos-inc/authkit-nextjs', () => ({
  withAuth: jest.fn(() =>
    Promise.resolve({
      user: mockWorkosUser,
      sessionId: 'session_test123',
      organizationId: undefined,
      accessToken: 'mock_access_token',
      role: undefined,
      roles: [],
      permissions: [],
      entitlements: [],
      featureFlags: [],
      impersonator: undefined,
    } as never),
  ),
  getSignInUrl: jest.fn(() => '/sign-in'),
  getSignUpUrl: jest.fn(() => '/sign-up'),
  getSignOutUrl: jest.fn(() => '/sign-out'),
}));
```

**In Individual Tests**:

```typescript
import { withAuth } from '@workos-inc/authkit-nextjs';

const withAuthMock = withAuth as jest.MockedFunction<typeof withAuth>;

beforeEach(() => {
  // Mock authenticated user
  withAuthMock.mockResolvedValue({
    user: {
      id: 'user_test123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      // ... other UserInfo properties
    },
    sessionId: 'session_test123',
    // ... other session properties
  });
});
```

#### **2. Testing Unauthenticated State**

```typescript
import { createUnauthenticatedResponse } from '@/__mocks__/@workos-inc/authkit-nextjs';

it('should reject unauthenticated requests', async () => {
  withAuthMock.mockResolvedValue(createUnauthenticatedResponse());

  const result = await someProtectedAction();

  expect(result.error).toBe('Unauthorized');
});
```

#### **3. Testing Organization Context**

```typescript
import { createMockUserInfo } from '@/__mocks__/@workos-inc/authkit-nextjs';

it('should handle organization-scoped data', async () => {
  withAuthMock.mockResolvedValue(
    createMockUserInfo({
      user: { id: 'user_123', email: 'org-user@example.com' },
      organizationId: 'org_test123',
    }),
  );

  const result = await getOrganizationData();

  expect(result.organizationId).toBe('org_test123');
});
```

#### **4. Testing Role-Based Access**

```typescript
import { createMockAdminUser, createMockExpertUser } from '@/__mocks__/@workos-inc/authkit-nextjs';

describe('Role-based access', () => {
  it('should allow experts to access expert features', async () => {
    withAuthMock.mockResolvedValue(createMockExpertUser());

    const result = await accessExpertFeature();

    expect(result.success).toBe(true);
  });

  it('should allow admins to access admin features', async () => {
    withAuthMock.mockResolvedValue(createMockAdminUser());

    const result = await accessAdminFeature();

    expect(result.success).toBe(true);
  });
});
```

### **Schema Changes**

#### **Database Fields**

| Old Field (Clerk) | New Field (WorkOS)        |
| ----------------- | ------------------------- |
| `clerkUserId`     | `workosUserId`            |
| `clerkOrgId`      | `orgId`                   |
| N/A               | `guestWorkosUserId` (new) |
| N/A               | `guestOrgId` (new)        |

#### **Mock Data Updates**

```typescript
// OLD (Clerk)
const mockMeeting = {
  clerkUserId: 'user_abc123',
  guestEmail: 'guest@example.com',
  // ...
};

// NEW (WorkOS)
const mockMeeting = {
  workosUserId: 'user_abc123',
  orgId: null,
  guestWorkosUserId: null,
  guestOrgId: null,
  guestEmail: 'guest@example.com',
  // ...
};
```

### **Utility Functions**

#### **Available Mock Helpers** (`tests/__mocks__/@workos-inc/authkit-nextjs.ts`)

```typescript
// Create custom user
createMockWorkosUser({ id: 'custom_id', email: 'custom@example.com' });

// Create complete UserInfo with custom data
createMockUserInfo({ user: customUser, organizationId: 'org_123' });

// Create expert user (with expert role metadata)
createMockExpertUser();

// Create admin user (with admin role metadata)
createMockAdminUser();

// Create unauthenticated response
createUnauthenticatedResponse();
```

### **Common Gotchas**

#### **1. Type Casting for Mocks**

```typescript
// WorkOS UserInfo must be cast to 'never' for Jest mocks
withAuthMock.mockResolvedValue({
  user: mockWorkosUser,
  sessionId: 'session_123',
  // ...
} as never);
```

#### **2. Handling Optional Fields**

```typescript
// organizationId should be 'undefined', not 'null'
mockUserInfo.organizationId = undefined; // ✅ Correct
mockUserInfo.organizationId = null; // ❌ Wrong (type error)
```

#### **3. Profile Data Loading**

```typescript
// WorkOS stores name in separate ProfilesTable
// Must explicitly load in queries
const event = await db.query.EventsTable.findFirst({
  where: eq(EventsTable.id, id),
  with: {
    user: {
      with: {
        profile: true, // Required for firstName/lastName
      },
    },
  },
});

// Access with optional chaining
const name = event.user?.profile?.firstName;
```

### **Testing Checklist**

When migrating or writing new tests:

- [ ] Import WorkOS mocks from `tests/__mocks__/@workos-inc/`
- [ ] Use `withAuth()` instead of `auth()` or `currentUser()`
- [ ] Update mock data to use `workosUserId` and `orgId`
- [ ] Add null fields: `guestWorkosUserId`, `guestOrgId` (if applicable)
- [ ] Remove deprecated Stripe fields: `stripeRefundId`, `stripeMetadata`, etc.
- [ ] Use `createMockUserInfo()` for consistent mock structure
- [ ] Test unauthenticated state with `createUnauthenticatedResponse()`
- [ ] Verify profile data is loaded in database queries
- [ ] Check role-based access with proper mock helpers
- [ ] Run `pnpm type-check` to catch migration issues

### **Example: Complete Test Migration**

**Before (Clerk)**:

```typescript
import { auth, currentUser } from '@clerk/nextjs/server';

const authMock = auth as jest.MockedFunction<typeof auth>;

it('should update expert profile', async () => {
  authMock.mockReturnValue({ userId: 'user_123' });

  const result = await updateExpertProfile({
    /* ... */
  });

  expect(result.success).toBe(true);
});
```

**After (WorkOS)**:

```typescript
import { createMockUserInfo } from '@/__mocks__/@workos-inc/authkit-nextjs';
import { withAuth } from '@workos-inc/authkit-nextjs';

const withAuthMock = withAuth as jest.MockedFunction<typeof withAuth>;

it('should update expert profile', async () => {
  withAuthMock.mockResolvedValue(createMockUserInfo({ user: { id: 'user_123' } }));

  const result = await updateExpertProfile({
    /* ... */
  });

  expect(result.success).toBe(true);
});
```

### **Resources**

- **Migration Guide**: `/docs/WorkOS-migration/TEST-MIGRATION-PLAN.md`
- **WorkOS Docs**: [WorkOS AuthKit](https://workos.com/docs/authkit)
- **Mock Utilities**: `tests/__mocks__/@workos-inc/authkit-nextjs.ts`
- **Example Tests**: `tests/server/actions/expert-profile.test.ts`

---

**Next Steps**: Focus on High Priority Tasks, starting with missing API route tests for system health and user management endpoints.

**Maintenance**: Update this document monthly or when significant test coverage changes occur.
