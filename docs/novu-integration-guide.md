# 🔔 Novu Integration Guide

## 🚫 **CRITICAL: Avoid Direct Workflow Triggers**

**Do NOT use direct workflow.trigger() calls** - they cause 401 authentication errors in production.

## ✅ **Correct Integration Pattern**

### 1. **Define Workflows** (Framework)

```typescript
// config/novu.ts
import { workflow } from '@novu/framework';

export const myWorkflow = workflow(
  'my-workflow-id',
  async ({ step, payload }) => {
    await step.inApp('notification', () => ({
      subject: `Hello ${payload.userName}`,
      body: payload.message,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      message: z.string(),
    }),
  },
);
```

### 2. **Trigger Workflows** (Client)

```typescript
// In your cron jobs, webhooks, or API routes
import { triggerWorkflow } from '@/app/utils/novu';

await triggerWorkflow({
  workflowId: 'my-workflow-id', // Must match workflow definition
  to: {
    subscriberId: userId,
    email: userEmail, // Optional but recommended
    firstName: userFirstName, // Optional but recommended
  },
  payload: {
    userName: 'John Doe',
    message: 'Your account has been updated',
  },
});
```

## 🔧 **Architecture Overview**

```mermaid
graph TD
    A[config/novu.ts] -->|Defines| B[Workflow Objects]
    B -->|Served via| C[/api/novu Bridge]
    C -->|Authenticated with| D[Novu Cloud]

    E[app/utils/novu.ts] -->|Uses| F[Novu API Client]
    F -->|Triggers| D

    G[Your Code] -->|Calls| E
    G -.->|❌ NEVER| B

    style B fill:#ffeeee,stroke:#ff0000
    style E fill:#eeffee,stroke:#00aa00
    style G fill:#eeeeff,stroke:#0000aa
```

## 📝 **Common Patterns**

### **Cron Jobs**

```typescript
// app/api/cron/my-job/route.ts
import { triggerWorkflow } from '@/app/utils/novu';

export async function GET() {
  // Your cron logic...

  await triggerWorkflow({
    workflowId: 'scheduled-reminder',
    to: { subscriberId: userId },
    payload: {
      /* your data */
    },
  });
}
```

### **Webhooks**

```typescript
// app/api/webhooks/my-webhook/route.ts
import { triggerWorkflow } from '@/app/utils/novu';

export async function POST(request: Request) {
  // Process webhook...

  await triggerWorkflow({
    workflowId: 'webhook-notification',
    to: { subscriberId: userId },
    payload: {
      /* webhook data */
    },
  });
}
```

### **Notification Functions**

```typescript
// lib/my-notifications.ts
import { triggerWorkflow } from '@/app/utils/novu';
import { createUserNotification } from '@/lib/notifications';

export async function sendCustomNotification(params: {
  userId: string;
  message: string;
  expert?: { email?: string; firstName?: string };
}) {
  return await createUserNotification({
    userId: params.userId,
    type: NOTIFICATION_TYPE_ACCOUNT_UPDATE,
    data: {
      userName: params.expert?.firstName || 'User',
      message: params.message,
      email: params.expert?.email,
      firstName: params.expert?.firstName,
    },
  });
}
```

## ⚠️ **Common Mistakes**

### ❌ **WRONG: Direct Workflow Trigger**

```typescript
// This causes 401 authentication errors!
import { myWorkflow } from '@/config/novu';

await myWorkflow.trigger({
  to: userId,
  payload: { ... }
});
```

### ❌ **WRONG: Missing User Data**

```typescript
// Missing email/firstName reduces notification effectiveness
await triggerWorkflow({
  workflowId: 'my-workflow',
  to: { subscriberId: userId }, // ❌ No email/firstName
  payload: { ... }
});
```

### ❌ **WRONG: Hardcoded Workflow IDs**

```typescript
// Hard to maintain and error-prone
await triggerWorkflow({
  workflowId: 'hardcoded-id', // ❌ Magic string
  to: { subscriberId: userId },
  payload: { ... }
});
```

## ✅ **Best Practices**

### **1. Include User Context**

```typescript
await triggerWorkflow({
  workflowId: 'notification-id',
  to: {
    subscriberId: userId,
    email: user.email,        // ✅ Better deliverability
    firstName: user.firstName, // ✅ Personalization
  },
  payload: { ... }
});
```

### **2. Use Constants for Workflow IDs**

```typescript
// config/novu-workflows.ts
export const WORKFLOW_IDS = {
  PAYOUT_NOTIFICATION: 'expert-payout-notification',
  APPOINTMENT_REMINDER: 'appointment-reminder-24hr',
  HEALTH_CHECK_FAILURE: 'system-health',
} as const;

// Usage
await triggerWorkflow({
  workflowId: WORKFLOW_IDS.PAYOUT_NOTIFICATION, // ✅ Type-safe
  to: { subscriberId: userId },
  payload: { ... }
});
```

### **3. Handle Errors Gracefully**

```typescript
try {
  await triggerWorkflow({
    workflowId: 'my-workflow',
    to: { subscriberId: userId },
    payload: { ... }
  });
  console.log('✅ Notification sent successfully');
} catch (error) {
  console.error('❌ Failed to send notification:', error);
  // Don't throw - notification failures shouldn't break your main flow
}
```

### **4. Type Safety**

```typescript
interface PayoutNotificationPayload {
  amount: string;
  currency: string;
  expertName: string;
  payoutDate: string;
}

async function sendPayoutNotification(userId: string, payload: PayoutNotificationPayload) {
  await triggerWorkflow({
    workflowId: 'expert-payout-notification',
    to: { subscriberId: userId },
    payload, // ✅ Type-safe payload
  });
}
```

## 🔍 **Debugging & Troubleshooting**

### **1. 401 Authentication Errors**

```
Error: 401 Unauthorized
```

**Solution**: You're using direct workflow.trigger(). Use triggerWorkflow() instead.

### **2. Workflow Not Found**

```
Error: Workflow 'my-workflow' not found
```

**Solutions**:

- Ensure workflow ID matches definition in config/novu.ts
- Run `npx novu sync` to sync workflows to Novu Cloud
- Check Novu dashboard for workflow status

### **3. Missing Environment Variables**

```
Error: NOVU_SECRET_KEY is required
```

**Solutions**:

- Set NOVU_SECRET_KEY in .env.local
- Verify environment variables in production deployment

### **4. Payload Validation Errors**

```
Error: Invalid payload schema
```

**Solutions**:

- Check payload matches payloadSchema in workflow definition
- Validate required fields are present
- Ensure data types match schema

## 🚀 **Testing Your Integration**

### **1. Unit Tests**

```typescript
// tests/notifications/my-notification.test.ts
import { triggerWorkflow } from '@/app/utils/novu';

jest.mock('@/app/utils/novu');
const mockTriggerWorkflow = jest.mocked(triggerWorkflow);

test('should send notification with correct payload', async () => {
  await sendMyNotification(userId, payload);

  expect(mockTriggerWorkflow).toHaveBeenCalledWith({
    workflowId: 'expected-workflow-id',
    to: { subscriberId: userId },
    payload: expect.objectContaining({
      expectedField: 'expectedValue',
    }),
  });
});
```

### **2. Integration Tests**

```typescript
// tests/api/cron/my-cron.test.ts
test('cron job should trigger notifications', async () => {
  const response = await GET(new Request('http://localhost/api/cron/my-job'));

  expect(response.status).toBe(200);
  expect(mockTriggerWorkflow).toHaveBeenCalled();
});
```

## 📊 **Monitoring & Alerts**

### **1. Success Logging**

```typescript
try {
  await triggerWorkflow({ ... });
  console.log('✅ Notification triggered:', {
    workflowId: 'my-workflow',
    userId,
    timestamp: new Date().toISOString(),
  });
} catch (error) {
  console.error('❌ Notification failed:', {
    workflowId: 'my-workflow',
    userId,
    error: error.message,
    timestamp: new Date().toISOString(),
  });
}
```

### **2. Health Check Integration**

The `/api/healthcheck` endpoint now properly uses triggerWorkflow() for failure notifications, ensuring reliable monitoring.

## 📚 **Additional Resources**

- [Novu Framework Documentation](https://docs.novu.co/framework)
- [Novu API Documentation](https://docs.novu.co/api)
- [Context7 Novu Integration Guide](/novuhq/docs)
- [ESLint Rules Configuration](./.eslintrc.cjs)

## 🆘 **Need Help?**

1. Check this guide first
2. Review existing working examples in `/api/cron/appointment-reminders`
3. Test with `/api/healthcheck` endpoint
4. Check Novu dashboard for workflow status
5. Review application logs for detailed error messages

---

**Remember**: Novu Framework workflows are for **definition**, Novu Client is for **triggering**. Keep them separate! 🎯
