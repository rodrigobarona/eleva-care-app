# TODO Tracking - WorkOS Migration

**Last Updated**: November 6, 2025  
**Total TODOs**: 67 items  
**Status**: Comprehensive audit complete + Google Calendar migration tracked

---

## 📊 Overview

This document tracks all TODO comments found in the codebase during the WorkOS migration. Each TODO is categorized by priority and phase.

### Summary Statistics

| Category                    | Count | Priority    |
| --------------------------- | ----- | ----------- |
| Database Schema             | 13    | 🚨 Critical |
| Username Implementation     | 4     | 🚨 Critical |
| Google Calendar Integration | 3     | ⚠️ High     |
| Authentication              | 5     | ⚠️ High     |
| Webhook Handlers            | 2     | ⚠️ High     |
| Admin Features              | 4     | 📊 Medium   |
| Audit & Monitoring          | 6     | 📊 Medium   |
| Migration Scripts           | 3     | 📊 Medium   |
| Caching & Performance       | 5     | 🔧 Low      |
| Feature Development         | 4     | 🔧 Low      |
| Testing                     | 2     | 🔧 Low      |
| Legal & Compliance          | 4     | 🔧 Low      |

---

## 🚨 CRITICAL Priority (Must Complete for Migration)

### 1. Database Schema Updates (`drizzle/schema-workos.ts`)

**Total**: 13 items

#### Deprecated Fields to Remove (Phase 5)

```typescript
// Lines 131-133: UsersTable
firstName: text('first_name'),  // TODO: Remove - fetch from WorkOS API
lastName: text('last_name'),    // TODO: Remove - fetch from WorkOS API

// Lines 164-165: UsersTable
imageUrl: text('image_url'),    // TODO: Remove - fetch from WorkOS
welcomeEmailSentAt: timestamp('welcome_email_sent_at'), // TODO: Remove
onboardingCompletedAt: timestamp('onboarding_completed_at'), // TODO: Remove
```

**Action**: After Phase 4 migration, remove these fields and fetch from WorkOS API instead

**Impact**: Reduces database storage, ensures single source of truth

---

#### orgId Fields to Make Required (Phase 5)

**Total**: 9 tables

```typescript
// TODO: Make .notNull() after Clerk → WorkOS migration complete

// Line 325: EventsTable
orgId: uuid('org_id').references(() => OrganizationsTable.id),

// Line 356: SchedulesTable
orgId: uuid('org_id').references(() => OrganizationsTable.id),

// Line 398: MeetingsTable
orgId: uuid('org_id').references(() => OrganizationsTable.id),

// Line 470: ProfilesTable
orgId: uuid('org_id').references(() => OrganizationsTable.id),

// Line 515: RecordsTable
orgId: uuid('org_id').references(() => OrganizationsTable.id),

// Line 548: PaymentTransfersTable
orgId: uuid('org_id').references(() => OrganizationsTable.id),

// Line 587: SchedulingSettingsTable
orgId: uuid('org_id').references(() => OrganizationsTable.id),

// Line 611: BlockedDatesTable
orgId: uuid('org_id').references(() => OrganizationsTable.id),

// Line 639: SlotReservationsTable
orgId: uuid('org_id').references(() => OrganizationsTable.id),
```

**Action**: After Phase 4 completes, change all to `.notNull()`

**Impact**: Enforces org-per-user model, enables RLS policies

---

#### Field Rename (Phase 5)

```typescript
// Line 554: PaymentTransfersTable
expertClerkUserId: text('expert_clerk_user_id').notNull(),
// TODO: Rename to workosUserId after migration
```

**Action**: Rename field and update all references

**Migration SQL**:

```sql
ALTER TABLE payment_transfers
RENAME COLUMN expert_clerk_user_id TO workos_user_id;
```

---

### 2. Username Field Implementation

**Total**: 4 items  
**Files Affected**: 4  
**Blocking**: Profile URLs, sitemap generation, user discovery

#### Add Username to Schema

**File**: `drizzle/schema-workos.ts`

```typescript
// Add to UsersTable (around line 128)
export const UsersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  workosUserId: text('workos_user_id').notNull().unique(),
  email: text('email').notNull(),
  username: text('username').notNull().unique(), // ADD THIS
  // ... rest of fields
});
```

**Index Required**:

```sql
CREATE UNIQUE INDEX users_username_idx ON users(username);
```

---

#### Update Components

**File**: `components/auth/ProfileAccessControl.tsx` (Line 36)

```typescript
// CURRENT: Returns null
async function getUserByUsername(username: string): Promise<MinimalUser | null> {
  console.warn(`getUserByUsername called with ${username} - username field not yet implemented`);
  return null;
}

// TODO: Implement
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

**Files to Update**:

- [ ] `components/auth/ProfileAccessControl.tsx:36`
- [ ] `components/features/expert-setup/SetupCompletePublishCard.tsx:22`
- [ ] `app/sitemap.ts:37` (getPublishedUsernames)
- [ ] `app/sitemap.ts:57` (getPublishedUserEvents)

---

## 🧪 CRITICAL: Test Suite Migration (Phase 6)

**Status**: 📋 Planning Complete  
**Total Tasks**: 29  
**Estimated Time**: 9-13 hours  
**Blocking**: Production test suite  
**Documentation**: `docs/WorkOS-migration/TEST-MIGRATION-PLAN.md`

### Overview

Migrate all 33 test files from Clerk authentication/authorization to WorkOS AuthKit. This is blocking the production test suite and must be completed before deployment.

**See detailed plan**: `docs/WorkOS-migration/TEST-MIGRATION-PLAN.md`

### Phase 1: Core Foundation (2-3 hours)

- [ ] **1.1** Fix WorkOS mock types in `tests/setup.ts` (30 min)
  - Issue: `withAuth` mock type mismatch (line 261)
  - Fix return type structure for WorkOS AuthKit
  - Add proper TypeScript types for mocks
- [ ] **1.2** Delete Clerk mock directory `tests/__mocks__/@clerk/` (5 min)
- [ ] **1.3** Create WorkOS test utilities in `tests/__mocks__/@workos-inc/authkit-nextjs.ts` (45 min)
  - Create proper WorkOS mock module
  - Add test helpers: `mockAuthenticatedUser()`, `mockUnauthenticatedUser()`
  - Add organization helpers

### Phase 2: Server Actions (2-3 hours)

- [ ] **2.1** Fix `tests/server/actions/expert-profile.test.ts` (30 min)
  - Replace Clerk auth with WorkOS
  - Update role assertions
  - Add `orgId` to mock data
- [ ] **2.2** Fix `tests/server/actions/meetings.test.ts` (45 min)
  - Add `orgId` to all mock events/meetings
  - Remove `stripeRefundId` (not in schema)
  - Fix profile access patterns
- [ ] **2.3** Fix `tests/server/actions/stripe.test.ts` (30 min)
- [ ] **2.4** Fix `tests/server/actions/events.test.ts` (30 min)

### Phase 3: API & Integration Tests (3-4 hours)

- [ ] **3.1** Delete deprecated Clerk tests (10 min)
  - `tests/api/webhooks/clerk.test.ts`
  - `tests/deprecated/check-kv-sync.test.ts`
  - `tests/deprecated/expert-setup.test.ts`
  - `tests/lib/clerk-cache.test.ts`
- [ ] **3.2** Fix `tests/api/webhooks/stripe-identity.test.ts` (20 min)
  - Wrong import: `markStepCompleteForUser` → `markStepComplete`
- [ ] **3.3** Fix `tests/api/webhooks/stripe-connect.test.ts` (30 min)
- [ ] **3.4** Fix `tests/api/webhooks/blocked-date-refund.test.ts` (20 min)
- [ ] **3.5** Fix `tests/api/create-payment-intent.test.ts` (30 min)
- [ ] **3.6** Fix `tests/integration/services/security.test.ts` (30 min)
  - Missing `@/lib/integrations/clerk/security-utils`
- [ ] **3.7** Fix `tests/integration/availability-management.test.ts` (45 min)
- [ ] **3.8** Fix `tests/integration/expert-onboarding.test.ts` (45 min)
- [ ] **3.9** Fix `tests/integration/novu-workflow-execution.test.ts` (20 min)

### Phase 4: Library & Component Tests (1-2 hours)

- [ ] **4.1** Fix `tests/lib/transfer-utils.test.ts` (30 min)
  - Fix Stripe transfer mock types
- [ ] **4.2** Fix `tests/lib/audit-error-handling.test.ts` (15 min)
- [ ] **4.3** Fix `tests/lib/novu-workflow-fix.test.ts` (15 min)
- [ ] **4.4** Fix `tests/components/MeetingForm.test.tsx` (20 min)
- [ ] **4.5** Fix `tests/components/ProfilePublishToggle.test.tsx` (20 min)

### Phase 5: Cleanup & Verification (1 hour)

- [ ] **5.1** Update test utilities and mock factories (30 min)
- [ ] **5.2** Update `TEST_COVERAGE_REPORT.md` and document WorkOS patterns (20 min)
- [ ] **5.3** Run full test suite and verify all tests pass (10 min)

---

## ⚠️ HIGH Priority (Needed Soon After Migration)

### 3. Google Calendar Integration (3 items)

**Status**: Infrastructure complete (database + encryption), implementation pending  
**Reference**: `docs/09-integrations/IMPLEMENTATION-COMPLETE.md`

#### OAuth Callback Route

**File**: `server/googleCalendar.ts` (Migration item #6)

```typescript
// TODO: Create OAuth callback route
// File: app/api/auth/google/callback/route.ts
import { storeGoogleTokens } from '@/lib/integrations/google/oauth-tokens';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { user } = await withAuth();
  if (!user) return NextResponse.redirect('/sign-in');

  // Extract tokens from WorkOS OAuth response
  // Call storeGoogleTokens(user.id, tokens)
  // Redirect to success page
}
```

**Action**: Implement OAuth callback handler to receive and store encrypted tokens from WorkOS

**Prerequisites**:

- ✅ Database schema deployed
- ✅ Token encryption system ready
- ✅ Token management service created
- ❌ WorkOS OAuth provider configured

**Estimated Time**: 1 hour

---

#### Refactor googleCalendar.ts to Use New Token System

**File**: `server/googleCalendar.ts` (Migration item #7)

**Current Implementation** (Broken - uses Clerk):

```typescript
// BROKEN: Uses Clerk OAuth
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const response = await clerk.users.getUserOauthAccessToken(userId, 'google');
const token = response.data[0]?.token;
```

**New Implementation** (Use database-backed tokens):

```typescript
// NEW: Uses WorkOS OAuth + Database + Encryption
import { getGoogleOAuthClient } from '@/lib/integrations/google/oauth-tokens';

const auth = await getGoogleOAuthClient(workosUserId);
const calendar = google.calendar({ version: 'v3', auth });
```

**Functions to Refactor**:

1. `getOAuthClient()` (lines 113-141) - Replace with `getGoogleOAuthClient()`
2. `getCalendarEventTimes()` (lines 154-234) - Update to use new auth
3. `createCalendarEvent()` (lines 257-567) - Update to use new auth
4. `hasValidTokens()` (lines 578-588) - Replace with `hasGoogleCalendarConnected()`
5. `getGoogleCalendarClient()` (lines 633-651) - Update to use new system
6. `getGoogleAccessToken()` (lines 659-670) - Remove (handled by token service)

**Action**: Systematically replace all Clerk OAuth calls with new token management system

**Estimated Time**: 2 hours

---

#### Update Function Signatures for workosUserId

**File**: `server/googleCalendar.ts` (Migration item #8)

**Changes Required**:

```typescript
// Update all parameter names from generic patterns to explicit workosUserId
// Lines to update:
// - Line 109: @param workosUserId (already correct in JSDoc)
// - Line 113: async getOAuthClient(workosUserId: string)
// - Line 150: @param workosUserId (already correct in JSDoc)
// - Line 154: async getCalendarEventTimes(workosUserId: string, ...)
// - Line 246: @param workosUserId (already correct in JSDoc)
// - Line 268: workosUserId: string
// - Line 575: @param userId → @param workosUserId
// - Line 578: async hasValidTokens(workosUserId: string)
// - Line 629: @param userId → @param workosUserId
// - Line 633: async getGoogleCalendarClient(workosUserId: string)
// - Line 656: @param workosUserId (already correct in JSDoc)
// - Line 659: async function getGoogleAccessToken(workosUserId: string)
```

**Action**: Ensure all function parameters consistently use `workosUserId` naming

**Impact**: Improves code clarity and aligns with WorkOS migration standards

**Estimated Time**: 30 minutes

---

#### Summary - Google Calendar Migration

**Status**:

- ✅ Phase 1: Database schema (google_access_token, google_refresh_token, etc.)
- ✅ Phase 2: Token management service (`lib/integrations/google/oauth-tokens.ts`)
- ✅ Phase 3: AES-256-GCM encryption (same as medical records)
- ✅ Phase 4: Auto-refresh token handling
- ✅ Phase 5: Database columns deployed to production
- ❌ Phase 6: OAuth callback route implementation
- ❌ Phase 7: Refactor googleCalendar.ts
- ❌ Phase 8: Update function signatures

**Total Remaining**: ~3.5 hours

**Additional Requirements**:

- [ ] Configure WorkOS Dashboard (enable Google OAuth, check "Return OAuth tokens")
- [ ] Add Google OAuth credentials to environment variables
- [ ] Create "Connect Calendar" UI components
- [ ] Test full OAuth flow end-to-end

**Reference Documentation**:

- `docs/09-integrations/IMPLEMENTATION-COMPLETE.md` - Complete implementation guide
- `docs/09-integrations/google-calendar-workos-migration.md` - Migration strategy
- `docs/09-integrations/ENCRYPTION-IMPLEMENTATION.md` - Security details
- `lib/integrations/google/oauth-tokens.ts` - Token management service

---

### 4. Webhook Handlers (2 items)

#### Stripe Identity Webhook

**File**: `app/api/webhooks/stripe/handlers/identity.ts:77`

```typescript
// CURRENT: Requires auth context
await markExpertSetupStepComplete('identity', workosUserId);

// TODO: Implement webhook-specific version
await markExpertSetupStepCompleteWebhook('identity', workosUserId);
```

**Action**: Create webhook-specific function that doesn't require auth session

---

#### Stripe Account Webhook

**File**: `app/api/webhooks/stripe/handlers/account.ts:85`

Same issue as identity webhook.

**Action**: Create unified webhook helper:

```typescript
// server/actions/expert-setup-webhooks.ts
export async function markExpertSetupStepCompleteWebhook(
  step: SetupStep,
  workosUserId: string,
): Promise<void> {
  // No auth session required - called from webhook
  await db
    .update(ExpertSetupTable)
    .set({ [`${step}Completed`]: true })
    .where(eq(ExpertSetupTable.workosUserId, workosUserId));
}
```

---

### 4. Expert Setup Migration (2 items)

#### Google Account Disconnection

**File**: `components/_archive/features/expert-setup/ExpertSetupChecklist.tsx:148`

```typescript
// TODO: Update database to reflect disconnection
const handleGoogleAccountDisconnected = useCallback(() => {
  // Need to mark googleAccountCompleted = false in ExpertSetupTable
}, []);
```

**Action**: Add server action to update database

---

#### Reimplement with Database

**File**: `components/_archive/features/expert-setup/ExpertSetupChecklist.tsx:176-181`

The archived checklist needs full WorkOS/database migration.

**Action**: Complete the stub component in active `ExpertSetupChecklist.tsx`

---

### 5. Authentication Tracking (2 items)

#### Track Auth Method

**File**: `app/api/auth/callback/route.ts:51`

```typescript
// TODO: Track authentication method in analytics
// Log which SSO provider was used, for insights
```

**Action**: Add PostHog event:

```typescript
posthog.capture('user_authenticated', {
  method: 'workos',
  provider: session.organizationId ? 'sso' : 'magic_link',
  userId: session.userId,
});
```

---

#### Process Custom State

**File**: `app/api/auth/callback/route.ts:57`

```typescript
// TODO: Process custom state (e.g., team invites, feature flags)
const state = new URL(request.url).searchParams.get('state');
```

**Action**: Implement state handling for:

- Team invitations
- Feature flags
- Referral tracking
- Return URLs

---

## 📊 MEDIUM Priority (Operational Improvements)

### 6. Admin Features (4 items)

#### Permission Checks Needed

**Files**:

- `server/actions/expert-setup.ts:255` - `markStepComplete()`
- `server/actions/expert-setup.ts:295` - `resetSetup()`
- `server/actions/expert-setup.ts:330` - `getIncompleteExperts()`
- `lib/integrations/workos/preferences.ts:314` - preference updates

**Action**: Add role check to each:

```typescript
export async function markStepComplete(step: string) {
  const { user } = await withAuth();

  // Add this check
  const roles = await getUserRoles(user.id);
  if (!roles.includes('admin') && !roles.includes('superadmin')) {
    throw new Error('Unauthorized: Admin access required');
  }

  // ... existing logic
}
```

---

### 7. Audit & Monitoring (6 items)

#### Sentry Integration

**File**: `lib/utils/server/audit-workos.ts:330`

```typescript
// TODO: Add Sentry/monitoring integration
catch (error) {
  console.error('[Audit Log Failed]', error);
  // Add: Sentry.captureException(error);
}
```

---

#### Export Tracking

**File**: `lib/utils/server/audit-workos.ts:455`

```typescript
// TODO: Re-implement export record tracking after adding AuditLogExportsTable
```

**Action**: Add to schema:

```typescript
export const AuditLogExportsTable = pgTable('audit_log_exports', {
  id: uuid('id').primaryKey(),
  workosUserId: text('workos_user_id').notNull(),
  orgId: uuid('org_id').notNull(),
  exportedAt: timestamp('exported_at').notNull().defaultNow(),
  recordCount: integer('record_count').notNull(),
  format: text('format').notNull(), // 'csv' | 'json'
});
```

---

#### Schema Field Migration

**File**: `lib/utils/server/audit.ts:25`

```typescript
// TODO: Migrate schema field from clerkUserId to workosUserId
```

**Action**: Create migration script for legacy audit table

---

#### Monitoring Integrations

**Files**:

- `app/api/webhooks/stripe/handlers/payment.ts:361` - Payment monitoring
- `lib/integrations/stripe/identity.ts:428` - Identity verification monitoring
- `lib/utils/logger.ts:62` - Production logging

**Action**: Integrate with BetterStack, PostHog, or Sentry

---

### 8. Migration Scripts (3 items)

#### User Mapping Logic

**File**: `scripts/migrate-audit-logs-to-unified.ts:86-137`

```typescript
// TODO: Implement actual user mapping logic
function mapClerkUserIdToWorkOS(clerkUserId: string): string {
  // Load from migration-user-map.json
  const mapping = loadUserMapping();
  return mapping[clerkUserId] || clerkUserId;
}

// TODO: Get orgId from UserOrgMembershipsTable
function getOrgIdForUser(workosUserId: string): string {
  const membership = await db.query.UserOrgMembershipsTable.findFirst({
    where: eq(UserOrgMembershipsTable.workosUserId, workosUserId),
  });
  return membership?.orgId;
}
```

---

#### Legacy Verification

**Files**:

- `scripts/verify-legacy-schema.ts:14, 29`
- `scripts/verify-clerk-legacy-schema.ts:7`

**Action**: Re-enable database connections for legacy verification

---

## 🔧 LOW Priority (Future Enhancements)

### 9. Caching & Performance (5 items)

**Files** (all waiting for next-intl cacheComponents support):

- `app/[locale]/(public)/legal/[document]/page.tsx:11`
- `app/[locale]/(public)/trust/[document]/page.tsx:11`
- `app/[locale]/(public)/history/page.tsx:16`
- `app/[locale]/(public)/about/page.tsx:21`
- `next.config.ts:46`

**Action**: Update once next-intl adds cacheComponents support (Next.js 16.x minor release)

```typescript
// CURRENT
export const revalidate = 86400; // 24 hours

// FUTURE
('use cache');
cacheLife('days'); // When supported by next-intl
```

---

### 10. Feature Development (4 items)

#### Onboarding Flow

**File**: `app/(auth)/onboarding/page.tsx:19`

```typescript
// TODO: Add onboarding flow logic here
// - Collect user preferences
// - Show product tour
// - Setup workspace
```

---

#### Novu Integration

**File**: `emails/index.ts:32`

```typescript
// TODO: Implement Novu workflow integration
// Replace current email system with Novu workflows
```

---

#### Test Suite

**File**: `tests/server/actions/events.test.ts:8`

```typescript
// TODO: Implement test suite for event actions
```

---

#### Device Recognition

**File**: `tests/integration/services/security.test.ts:243`

```typescript
// TODO: Fix device recognition logic to properly check deviceHistory
```

---

### 11. Legal & Compliance (4 items)

**File**: `docs/06-legal/platform/03-platform-clarity-updates.md`

Multiple TODO items for platform clarity:

- Line 330: Still TODO - Critical Items
- Line 438: Sign-Up → Add disclaimer notice
- Line 448: Sign-Up → Add practitioner requirements notice
- Line 450: Practitioner Agreement → Create dedicated agreement

---

## 🎯 TODO Completion Plan by Phase

### Phase 4: Legacy Data Migration

**Target**: Complete critical schema TODOs

- [ ] Implement user mapping logic in migration scripts
- [ ] Test orgId population
- [ ] Prepare field rename scripts

**Estimated Time**: 1 day

---

### Phase 5: Schema Consolidation

**Target**: Apply all schema changes

- [ ] Add `username` field to UsersTable
- [ ] Make all `orgId` fields `.notNull()`
- [ ] Remove deprecated fields (`firstName`, `lastName`, `imageUrl`)
- [ ] Rename `expertClerkUserId` to `workosUserId`
- [ ] Implement `getUserByUsername()` function
- [ ] Update sitemap generation
- [ ] Generate and apply migration

**Estimated Time**: 1 day

---

### Phase 6: Post-Migration Enhancements

**Target**: High and medium priority TODOs

**Week 1** (High Priority):

- [ ] **Google Calendar Integration** (~3.5 hours)
  - [ ] Implement OAuth callback route (1 hour)
  - [ ] Refactor googleCalendar.ts to use new token system (2 hours)
  - [ ] Update function signatures for workosUserId (30 min)
  - [ ] Configure WorkOS Dashboard for Google OAuth
  - [ ] Test full OAuth flow end-to-end
- [ ] Implement webhook-specific step completion
- [ ] Complete expert setup migration
- [ ] Add authentication tracking

**Week 2** (Medium Priority):

- [ ] Add admin permission checks
- [ ] Integrate monitoring services
- [ ] Complete migration scripts

**Estimated Time**: 2 weeks

---

### Phase 7: Future Enhancements

**Target**: Low priority TODOs

**As needed**:

- [ ] Implement caching improvements (when next-intl supports it)
- [ ] Complete onboarding flow
- [ ] Migrate to Novu
- [ ] Improve test coverage
- [ ] Update legal docs

**Estimated Time**: Ongoing

---

## 📋 Quick Reference

### By File Location

**Most TODOs**:

1. `drizzle/schema-workos.ts` - 13 items
2. `docs/06-legal/platform/03-platform-clarity-updates.md` - 4 items
3. `app/sitemap.ts` - 3 items
4. `scripts/migrate-audit-logs-to-unified.ts` - 3 items

**Critical Files**:

- `drizzle/schema-workos.ts` - Schema updates
- `components/auth/ProfileAccessControl.tsx` - Username implementation
- `server/googleCalendar.ts` - Google Calendar migration
- `app/api/webhooks/stripe/handlers/*.ts` - Webhook fixes

---

## 📝 Notes

### Maintenance

- This document should be updated as TODOs are completed
- New TODOs should be added with proper categorization
- Completed items should be archived (moved to bottom with ✅)

### Tracking Convention

```typescript
// TODO: Brief description
// TODO (Phase X): Description with phase number
// TODO: [CRITICAL] Description for blocking items
```

---

**Next Review**: After Phase 4 completion  
**Owner**: Development Team  
**Last Audit**: November 5, 2025
