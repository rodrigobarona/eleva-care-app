# Testing Universal Novu Workflows

## Overview

Universal workflows in Eleva Care use **conditional step execution** based on the `eventType` parameter. This allows a single workflow to handle multiple related events with different notification logic.

## 🔄 Universal Workflows vs. Regular Workflows

### Universal Workflows (Conditional Steps)

- **Single workflow ID** handles multiple event types
- **Conditional logic** determines which steps execute
- **Event-driven routing** based on `payload.eventType`
- **Efficient workflow management** (reduces total workflow count)

### Regular Workflows (Direct Steps)

- **Single purpose** workflows with fixed steps
- **All steps execute** when triggered
- **No conditional logic** required

## 📋 Available Universal Workflows

| Workflow ID             | Event Types                                                                                                      | Purpose                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `user-lifecycle`        | `welcome`, `user-created`                                                                                        | User onboarding and account creation |
| `security-auth`         | `security-alert`, `account-verification`, `recent-login`                                                         | Security and authentication events   |
| `payment-universal`     | `payment-success`, `payment-failed`, `stripe-account-update`, `stripe-payout`                                    | Payment and financial transactions   |
| `expert-management`     | `onboarding-complete`, `setup-step-complete`, `identity-verification`, `google-account`, `payout-setup-reminder` | Expert onboarding and management     |
| `appointment-universal` | `reminder`, `cancelled`, `new-booking-expert`                                                                    | Appointment lifecycle events         |
| `marketplace-universal` | `payment-received`, `payout-processed`, `connect-account-status`                                                 | Marketplace operations               |
| `system-health`         | `health-check-failure`                                                                                           | System monitoring and alerts         |

## 🧪 How to Test Universal Workflows

### 1. Basic Workflow Test

```bash
# Test framework functionality and list all workflows
pnpm test:novu-workflow
```

### 2. Comprehensive Testing (All Event Types)

```bash
# Test all workflows with all their event types
pnpm test:workflows
```

### 3. Manual Testing (Single Workflow/Event)

```javascript
const { Novu } = require('@novu/api');
const novu = new Novu({ secretKey: process.env.NOVU_SECRET_KEY });

// Test security-auth workflow with security-alert event
await novu.trigger({
  workflowId: 'security-auth',
  to: { subscriberId: 'your-subscriber-id' },
  payload: {
    eventType: 'security-alert', // 🔑 KEY: This determines which steps execute
    userId: 'user_123',
    alertType: 'suspicious-login',
    message: 'Security alert detected',
    locale: 'pt',
  },
});
```

## 🎯 Understanding Conditional Execution

### Example: `security-auth` Workflow

The workflow contains conditional logic:

```typescript
// config/novu.ts
export const securityAuthWorkflow = workflow('security-auth', async ({ payload, step }) => {
  const eventType = payload.eventType as string;

  // Only executes if eventType === 'security-alert'
  if (eventType === 'security-alert') {
    await step.inApp('security-alert', async () => ({
      subject: 'Security Alert',
      body: `Alert: ${payload.message}`,
    }));
  }

  // Only executes if eventType === 'account-verification'
  if (eventType === 'account-verification') {
    await step.inApp('verification-reminder', async () => ({
      subject: 'Verify Your Account',
      body: 'Please complete account verification',
    }));
  }

  // Only executes if eventType === 'recent-login'
  if (eventType === 'recent-login') {
    await step.inApp('login-tracking', async () => ({
      subject: 'Recent Login',
      body: `Login detected from ${payload.deviceInfo}`,
    }));
  }
});
```

### Testing Different Event Types

```bash
# Test 1: Security Alert
curl -X POST https://eu.api.novu.co/v1/events/trigger \
  -H "Authorization: ApiKey YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "security-auth",
    "to": ["subscriber-id"],
    "payload": {
      "eventType": "security-alert",
      "userId": "user_123",
      "message": "Suspicious activity detected"
    }
  }'

# Test 2: Account Verification
curl -X POST https://eu.api.novu.co/v1/events/trigger \
  -H "Authorization: ApiKey YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "security-auth",
    "to": ["subscriber-id"],
    "payload": {
      "eventType": "account-verification",
      "userId": "user_123",
      "verificationUrl": "https://eleva.care/verify/token"
    }
  }'
```

## 🔍 Verifying Test Results

### 1. Novu Dashboard

- Visit: https://web.novu.co/activities
- Check **Activities** tab for triggered workflows
- Verify which **specific steps** were executed
- Look for transaction IDs from your tests

### 2. In-App Notifications

- Check the Eleva Care app for in-app notifications
- Each `eventType` should create different notification content
- Verify notifications appear in the subscriber's inbox

### 3. Email Notifications

- Some universal workflows include email steps
- Check your email for triggered email notifications
- Verify email content matches the `eventType` tested

## 🚨 Troubleshooting

### Workflow Not Executing

```bash
# Check if the workflow exists
pnpm test:novu-workflow

# Verify payload schema
# Universal workflows require 'eventType' in payload
{
  "eventType": "required-event-type",  // ❗ Required for universal workflows
  "locale": "pt",                      // Recommended for localization
  "country": "PT"                      // Recommended for localization
}
```

### No Steps Executed

- **Check `eventType`**: Ensure it matches expected values in workflow definition
- **Case sensitivity**: Event types are case-sensitive (`payment-success` ≠ `Payment-Success`)
- **Payload validation**: Check if required fields are missing

### API Errors

```bash
# Verify environment variables
echo $NOVU_SECRET_KEY
echo $NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER

# Test API connection
pnpm test:novu-workflow
```

## 📊 Test Coverage Summary

Our enhanced test scripts cover:

✅ **7 Universal Workflows** with **25+ Event Types**
✅ **Conditional step execution** for each event type
✅ **Portuguese localization** (`locale: 'pt'`)
✅ **Realistic test data** for Portuguese healthcare context
✅ **Comprehensive error handling** and reporting
✅ **Step-by-step verification** guide

## 🎓 Best Practices

1. **Always include `eventType`** in universal workflow payloads
2. **Test each event type separately** to verify conditional logic
3. **Use realistic data** that matches your application context
4. **Check Novu dashboard** after each test to verify step execution
5. **Include locale/country** for proper localization
6. **Follow payload schema** defined in workflow definitions

## 🔗 Related Resources

- [Novu Framework Documentation](https://docs.novu.co/framework)
- [Workflow Configuration](../config/novu.ts)
- [Test Scripts](../scripts/)
- [Novu Dashboard](https://web.novu.co)
