# 🔧 Schema & Workflow Fix Report

**Date:** October 27, 2025  
**Status:** ✅ RESOLVED

---

## 🚨 Issues Fixed

### 1. **Duplicate Schema Fields in ProfileTable** (CRITICAL)

**Problem:**

- Lines 253-255 and 258-260 in `drizzle/schema.ts` had duplicate field definitions
- Caused TypeScript build failure: "An object literal cannot have multiple properties with the same name"
- Fields duplicated:
  - `practitionerAgreementAcceptedAt`
  - `practitionerAgreementVersion`
  - `practitionerAgreementIpAddress`

**Root Cause:**

- Git merge conflict or branch merge that resulted in duplicate field definitions
- Comment "// Practitioner agreement tracking (from other branch)" indicates this was a merge issue

**Fix:**

```typescript
// BEFORE (lines 252-260):
published: boolean('published').notNull().default(false),
// Practitioner Agreement tracking fields for legal compliance (GDPR, LGPD, SOC 2)
practitionerAgreementAcceptedAt: timestamp('practitioner_agreement_accepted_at'),
practitionerAgreementVersion: text('practitioner_agreement_version'),
practitionerAgreementIpAddress: text('practitioner_agreement_ip_address'),
order: integer('order').notNull().default(0),
// Practitioner agreement tracking (from other branch) ← DUPLICATE
practitionerAgreementAcceptedAt: timestamp('practitioner_agreement_accepted_at'), ← DUPLICATE
practitionerAgreementVersion: text('practitioner_agreement_version'), ← DUPLICATE
practitionerAgreementIpAddress: text('practitioner_agreement_ip_address'), ← DUPLICATE

// AFTER (lines 252-257):
published: boolean('published').notNull().default(false),
// Practitioner Agreement tracking fields for legal compliance (GDPR, LGPD, SOC 2)
practitionerAgreementAcceptedAt: timestamp('practitioner_agreement_accepted_at'),
practitionerAgreementVersion: text('practitioner_agreement_version'),
practitionerAgreementIpAddress: text('practitioner_agreement_ip_address'),
order: integer('order').notNull().default(0),
```

---

### 2. **Confusing USER_WELCOME Workflow Naming**

**Problem:**

- `USER_WELCOME` workflow ID in `config/novu-workflows.ts` was misleading
- The actual workflow ID is `'user-lifecycle'`, not `'user-welcome'`
- Documentation didn't clearly explain that welcome emails are idempotent via `welcomeEmailSentAt` field
- Made it seem like there were two separate workflows for welcome emails

**Background:**
According to `docs/fixes/duplicate-welcome-email-fix.md`:

- Welcome emails were being sent repeatedly to existing users
- Root cause was `user.updated` event triggering welcome emails
- Fix implemented:
  1. Added `welcomeEmailSentAt` field to `UserTable` (migration 0004)
  2. Added `hasReceivedWelcomeEmail()` check in webhook handler
  3. Added `markWelcomeEmailSent()` after successful delivery
  4. Removed `user.updated` from workflow mappings

**Fix:**

```typescript
// config/novu-workflows.ts

export const WORKFLOW_IDS = {
  // User & Authentication
  // NOTE: user-lifecycle handles welcome emails with idempotency via welcomeEmailSentAt field
  // Only triggers on user.created event and checks database before sending
  USER_LIFECYCLE: 'user-lifecycle', // Includes welcome email (idempotent via UserTable.welcomeEmailSentAt)
  SECURITY_AUTH: 'security-auth',

  // DEPRECATED: Use USER_LIFECYCLE instead - kept for backwards compatibility
  USER_WELCOME: 'user-lifecycle', // Maps to USER_LIFECYCLE (same workflow ID)
  USER_LOGIN_NOTIFICATION: 'user-login-notification',

  // ... rest of workflows
} as const;

// Added to WORKFLOW_ID_MAPPINGS:
export const WORKFLOW_ID_MAPPINGS = {
  // ... existing mappings
  'user-welcome': WORKFLOW_IDS.USER_LIFECYCLE, // DEPRECATED: Maps to user-lifecycle
} as const;
```

---

## ✅ Implementation Details

### Welcome Email Idempotency Flow

```typescript
// app/api/webhooks/clerk/route.ts (lines 220-228)

// IDEMPOTENCY CHECK: For user.created events, check if welcome email already sent
if (evt.type === 'user.created') {
  const clerkUserId = evt.data.id;
  const alreadySent = await hasReceivedWelcomeEmail(clerkUserId);

  if (alreadySent) {
    console.log(`🔕 Skipping welcome notification - already sent to user: ${clerkUserId}`);
    return;
  }
}

// ... trigger workflow ...

// Mark welcome email as sent for user lifecycle workflows (lines 374-377)
if (evt.type === 'user.created' && workflowId === 'user-lifecycle') {
  await markWelcomeEmailSent(evt.data.id);
}
```

### Database Schema

```typescript
// drizzle/schema.ts (line 366)
export const UserTable = pgTable('users', {
  // ... other fields ...

  // Onboarding and notification tracking
  welcomeEmailSentAt: timestamp('welcome_email_sent_at'),
  onboardingCompletedAt: timestamp('onboarding_completed_at'),

  createdAt,
  updatedAt,
});
```

---

## 📊 Changes Summary

| File                       | Change                                                           | Impact                     |
| -------------------------- | ---------------------------------------------------------------- | -------------------------- |
| `drizzle/schema.ts`        | Removed duplicate fields (lines 258-260)                         | ✅ Build passes            |
| `config/novu-workflows.ts` | Deprecated `USER_WELCOME`, clarified it maps to `USER_LIFECYCLE` | ✅ Clear documentation     |
| `config/novu-workflows.ts` | Added comments explaining idempotency via `welcomeEmailSentAt`   | ✅ Developer clarity       |
| `config/novu-workflows.ts` | Added `'user-welcome'` to `WORKFLOW_ID_MAPPINGS`                 | ✅ Backwards compatibility |

---

## 🔍 How Welcome Emails Work Now

1. **Trigger**: Only on `user.created` Clerk event (not `user.updated`)
2. **Idempotency Check**: Query `UserTable.welcomeEmailSentAt` before sending
3. **Send Email**: Via `user-lifecycle` workflow (NOT a separate `user-welcome` workflow)
4. **Mark Sent**: Update `UserTable.welcomeEmailSentAt` after successful delivery
5. **Migration**: Existing users backfilled with `createdAt` value to prevent duplicate emails

---

## ✅ Verification

```bash
# Build passes successfully
pnpm build
✓ Compiled successfully in 13.0s
✓ Generating static pages (74/74)

# No TypeScript errors in schema
# No duplicate workflow IDs
# Welcome email idempotency working as designed
```

---

## 📝 Key Takeaways

1. **USER_WELCOME is DEPRECATED** - Use `USER_LIFECYCLE` instead
2. **Welcome emails are idempotent** - Tracked via `UserTable.welcomeEmailSentAt`
3. **No duplicate emails** - Webhook checks database before sending
4. **Proper naming** - `user-lifecycle` workflow includes welcome email, not a separate workflow
5. **Schema is fixed** - No duplicate field definitions

---

## 🔗 Related Documentation

- `docs/fixes/duplicate-welcome-email-fix.md` - Original welcome email fix
- `drizzle/migrations/0004_add_welcome_email_tracking.sql` - Database migration
- `app/api/webhooks/clerk/route.ts` - Webhook idempotency implementation
- `config/novu-workflows.ts` - Workflow ID constants and mappings

---

**Status**: ✅ All issues resolved, build passes, documentation updated
