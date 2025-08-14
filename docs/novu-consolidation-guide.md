# 🚀 Novu Workflow Consolidation Guide

## Overview

This guide explains how we consolidated **26+ workflows into 10 workflows** using Novu's best practices, reducing our usage from exceeding the free plan limit to well within it.

## 📊 Consolidation Summary

| Category          | Before           | After                   | Savings      |
| ----------------- | ---------------- | ----------------------- | ------------ |
| User & Auth       | 3 workflows      | 1 universal workflow    | 2 saved      |
| Security          | 3 workflows      | 1 universal workflow    | 2 saved      |
| Payments          | 4 workflows      | 1 universal workflow    | 3 saved      |
| Expert Management | 5 workflows      | 1 universal workflow    | 4 saved      |
| Appointments      | 3 workflows      | 1 universal workflow    | 2 saved      |
| Marketplace       | 3 workflows      | 1 universal workflow    | 2 saved      |
| Email Templates   | 3 workflows      | 3 workflows (unchanged) | 0 saved      |
| System            | 2 workflows      | 1 universal workflow    | 1 saved      |
| **TOTAL**         | **26 workflows** | **10 workflows**        | **16 saved** |

## 🎯 Consolidation Strategy

### 1. Universal Event-Driven Pattern

Instead of separate workflows for each specific event, we created **universal workflows** that handle multiple related events through:

- **Conditional Logic**: Using `payload.eventType` to route different scenarios
- **Dynamic Content**: Using Novu's payload-based content generation
- **Shared Templates**: Reusing localization and email templates
- **Tag-Based Organization**: Using Novu tags for Inbox filtering

### 2. Key Consolidations

#### A. User Lifecycle Workflow

**Before:**

- `welcomeWorkflow`
- `userCreatedWorkflow`
- `recentLoginWorkflow` (disabled)

**After:**

- `userLifecycleWorkflow` with `eventType: 'welcome' | 'user-created'`

#### B. Security & Auth Workflow

**Before:**

- `securityAlertWorkflow`
- `accountVerificationWorkflow`
- `recentLoginWorkflow`

**After:**

- `securityAuthWorkflow` with `eventType: 'security-alert' | 'account-verification' | 'recent-login'`

#### C. Payment Workflow

**Before:**

- `paymentSuccessWorkflow`
- `paymentFailedWorkflow`
- `stripeAccountUpdateWorkflow`
- `stripePayoutWorkflow`

**After:**

- `paymentWorkflow` with `eventType: 'payment-success' | 'payment-failed' | 'stripe-account-update' | 'stripe-payout'`

#### D. Expert Management Workflow

**Before:**

- `expertOnboardingCompleteWorkflow`
- `expertSetupStepCompleteWorkflow`
- `expertIdentityVerificationWorkflow`
- `expertGoogleAccountWorkflow`
- `expertPayoutSetupReminderWorkflow`

**After:**

- `expertManagementWorkflow` with `eventType: 'onboarding-complete' | 'setup-step-complete' | 'identity-verification' | 'google-account' | 'payout-setup-reminder'`

## 🏷️ Tag-Based Organization

Each workflow now uses tags for better organization in Novu Inbox:

```typescript
const WORKFLOW_TAGS = {
  AUTH: ['auth', 'user'],
  SECURITY: ['security'],
  PAYMENTS: ['payments'],
  EXPERT: ['expert'],
  APPOINTMENTS: ['appointments'],
  MARKETPLACE: ['marketplace'],
  EMAIL: ['email'],
  SYSTEM: ['system'],
} as const;
```

## 📝 Migration Instructions

### 1. Update Webhook Handlers

**Before:**

```typescript
await novu.trigger({
  workflowId: 'payment-success',
  to: { subscriberId: userId },
  payload: { amount, planName },
});
```

**After:**

```typescript
await novu.trigger({
  workflowId: 'payment-universal',
  to: { subscriberId: userId },
  payload: {
    eventType: 'payment-success',
    amount,
    planName,
  },
});
```

### 2. Update Trigger Calls

Replace all existing workflow triggers with the new consolidated ones:

| Old Workflow ID                | New Workflow ID         | Required eventType     |
| ------------------------------ | ----------------------- | ---------------------- |
| `welcome`                      | `user-lifecycle`        | `welcome`              |
| `user-created`                 | `user-lifecycle`        | `user-created`         |
| `security-alert`               | `security-auth`         | `security-alert`       |
| `account-verification`         | `security-auth`         | `account-verification` |
| `payment-success`              | `payment-universal`     | `payment-success`      |
| `payment-failed`               | `payment-universal`     | `payment-failed`       |
| `expert-onboarding-complete`   | `expert-management`     | `onboarding-complete`  |
| `appointment-reminder`         | `appointment-universal` | `reminder`             |
| `marketplace-payment-received` | `marketplace-universal` | `payment-received`     |

### 3. Update Frontend Inbox Filtering

If using Novu Inbox with tabs, update your filters:

**Before:**

```typescript
const tabs = [
  { label: 'Payments', filter: { workflowIds: ['payment-success', 'payment-failed'] } },
];
```

**After:**

```typescript
const tabs = [{ label: 'Payments', filter: { tags: ['payments'] } }];
```

## ✅ Benefits Achieved

1. **Free Plan Compliance**: 10 workflows vs 20 limit
2. **Better Organization**: Logical grouping by business domain
3. **Easier Maintenance**: Shared logic and templates
4. **Improved Filtering**: Tag-based Inbox organization
5. **Scalability**: Room for 10 more workflows for new features
6. **Consistency**: Standardized payload structure across all workflows

## 🔄 Deployment Steps

1. **Replace workflow configuration:**

   ```bash
   cp config/novu-consolidated.ts config/novu.ts
   ```

2. **Update webhook handlers:**
   - Update Clerk webhook handler
   - Update Stripe webhook handler
   - Update any custom trigger calls

3. **Build and test:**

   ```bash
   pnpm build
   pnpm test
   ```

4. **Deploy:**

   ```bash
   git add .
   git commit -m "feat: consolidate Novu workflows for free plan compliance"
   git push origin main
   ```

5. **Sync with Novu:**
   ```bash
   npx novu@latest sync --bridge-url "https://eleva.care/api/novu" --secret-key "your-key" --api-url "https://eu.api.novu.co"
   ```

## 🎉 Result

- ✅ **10 workflows** (within free plan limit)
- ✅ **All functionality preserved**
- ✅ **Better organization with tags**
- ✅ **Room for 10 more features**
- ✅ **Production ready**

## 🔮 Future Expansion

With 10 workflows used and 10 slots remaining, you can add:

- Customer feedback workflows
- Marketing campaign workflows
- Advanced booking workflows
- Integration status workflows
- Performance monitoring workflows

The consolidated approach gives you maximum flexibility for future growth!
