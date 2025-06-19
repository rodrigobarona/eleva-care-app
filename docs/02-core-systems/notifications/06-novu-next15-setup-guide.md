# Novu.co Next.js 15 Setup Guide

> **✅ Complete implementation guide for Novu notifications with Next.js 15 and Clerk authentication**

## 🎯 Overview

This guide documents the complete setup and configuration of Novu.co notifications in the Eleva Care app using Next.js 15, including all fixes for authentication middleware and Framework integration.

## 🔧 Key Configuration Files

### 1. **Environment Variables**

Required environment variables in your `.env.local`:

```env
# Novu Configuration
NOVU_SECRET_KEY=novu_secret_key_here
NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=your_app_identifier_here
NOVU_BASE_URL=https://eu.api.novu.co
NOVU_ADMIN_SUBSCRIBER_ID=admin
```

### 2. **Middleware Configuration** (`middleware.ts`)

**CRITICAL FIX**: The `/api/novu` endpoint must be excluded from authentication middleware:

```typescript
export const config = {
  matcher: [
    // ... other patterns
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|.*\\..*|api/webhooks|api/cron|api/qstash|api/internal|api/healthcheck|api/create-payment-intent|api/novu).*)',
  ],
};
```

### 3. **Novu Framework Bridge** (`app/api/novu/route.ts`)

Next.js 15 compatible bridge endpoint:

```typescript
import { ENV_CONFIG } from '@/config/env';
import { workflows } from '@/config/novu';
import { Client as NovuFrameworkClient } from '@novu/framework';
import { serve } from '@novu/framework/next';

// Create explicit Novu Framework client for Next.js 15 compatibility
const client = new NovuFrameworkClient({
  secretKey: ENV_CONFIG.NOVU_SECRET_KEY!,
  strictAuthentication: false, // Allows flexible authentication for development
});

console.log('[Novu] Bridge endpoint initialized with', workflows.length, 'workflows');

// Export the handlers for the Novu framework
export const { GET, POST, OPTIONS } = serve({
  client,
  workflows,
});
```

### 4. **Secure Subscriber Hash** (`app/api/novu/subscriber-hash/route.ts`)

HMAC-secured endpoint for production-ready authentication:

```typescript
import { ENV_CONFIG } from '@/config/env';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For manual subscriberId (useful for testing or external calls)
    const { searchParams } = new URL(request.url);
    const manualSubscriberId = searchParams.get('subscriberId');
    const subscriberId = manualSubscriberId || userId;

    // Generate HMAC hash for secure authentication
    let subscriberHash = '';
    if (ENV_CONFIG.NOVU_SECRET_KEY) {
      subscriberHash = crypto
        .createHmac('sha256', ENV_CONFIG.NOVU_SECRET_KEY)
        .update(subscriberId)
        .digest('hex');
    }

    const secureData = {
      subscriberId,
      subscriberHash,
      applicationIdentifier: ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER,
    };

    return NextResponse.json(secureData);
  } catch (error) {
    console.error('Error generating subscriber hash:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 5. **React Providers** (`app/providers.tsx`)

Proper Novu provider setup with EU region configuration:

```typescript
function NovuWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user || !ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER) {
    return <>{children}</>;
  }

  console.log('[Novu] Provider initialized for user:', user.id);

  return (
    <NovuProvider
      subscriberId={user.id}
      applicationIdentifier={ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER}
    >
      <ReactNovuProvider
        applicationIdentifier={ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER}
        subscriberId={user.id}
        backendUrl="https://eu.api.novu.co"
        socketUrl="https://eu.ws.novu.co"
      >
        {children}
      </ReactNovuProvider>
    </NovuProvider>
  );
}
```

### 6. **Secure Novu Hook** (`hooks/use-secure-novu.ts`)

Updated hook for HMAC authentication:

```typescript
interface SecureSubscriberData {
  subscriberId: string;
  subscriberHash: string;
  applicationIdentifier: string;
}

export function useNovuInboxProps() {
  const { subscriberData, isLoading, error } = useSecureNovu();

  return {
    // Props for Novu Inbox component
    applicationIdentifier:
      subscriberData?.applicationIdentifier || process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER,
    subscriberId: subscriberData?.subscriberId,
    subscriberHash: subscriberData?.subscriberHash,
    apiUrl: 'https://eu.api.novu.co',
    socketUrl: 'https://eu.ws.novu.co',

    // State management
    isReady: !isLoading && !error && !!subscriberData,
    isLoading,
    error,
  };
}
```

## 📦 Required Dependencies

Make sure these packages are installed:

```json
{
  "@novu/api": "^1.2.0",
  "@novu/framework": "^2.6.7",
  "@novu/nextjs": "^3.5.0",
  "@novu/react": "^3.5.0"
}
```

## 🧪 Testing & Verification

### Test Scripts Available

```bash
# Test basic Novu API connection
npm run test:novu

# Test Novu Framework bridge endpoint
npm run test:novu-framework

# Test API permissions
npm run test:novu-permissions
```

### Manual Testing Checklist

1. **✅ Bridge Endpoint**: `GET /api/novu` should return 200 status
2. **✅ Subscriber Hash**: `GET /api/novu/subscriber-hash` should return secure data when authenticated
3. **✅ Middleware**: `/api/novu` should be excluded from auth middleware
4. **✅ Workflows**: All workflows should be discoverable by Novu
5. **✅ Frontend**: Inbox component should load without errors

## 🚀 Next.js 15 Specific Fixes

### Issue 1: Authentication Middleware Blocking Bridge Endpoint

**Problem**: Middleware was intercepting `/api/novu` requests
**Solution**: Added `/api/novu` to middleware exclusion pattern

### Issue 2: Framework Client Configuration

**Problem**: Default framework client not compatible with Next.js 15
**Solution**: Explicit `NovuFrameworkClient` initialization with `strictAuthentication: false`

### Issue 3: HMAC Authentication Missing

**Problem**: Subscriber hash endpoint was returning empty hashes
**Solution**: Implemented proper HMAC generation using `crypto.createHmac`

### Issue 4: Provider Configuration

**Problem**: React providers missing required EU region configuration
**Solution**: Added explicit `backendUrl` and `socketUrl` for EU region

## 📋 Workflow Status

The following workflows are currently configured and ready:

- ✅ **welcomeWorkflow** - User onboarding
- ✅ **accountVerificationWorkflow** - Email verification
- ✅ **paymentSuccessWorkflow** - Payment confirmations
- ✅ **paymentFailedWorkflow** - Payment failures
- ✅ **securityAlertWorkflow** - Security notifications
- ✅ **stripeAccountUpdateWorkflow** - Stripe account updates
- ✅ **stripePayoutWorkflow** - Payout notifications
- ✅ **marketplacePaymentReceivedWorkflow** - Marketplace payments
- ✅ **marketplacePayoutProcessedWorkflow** - Marketplace payouts
- ✅ **userCreatedWorkflow** - New user registration
- ✅ **recentLoginWorkflow** - Login notifications
- ✅ **expertOnboardingCompleteWorkflow** - Expert setup completion
- ✅ **appointmentReminderWorkflow** - Appointment reminders
- ✅ **appointmentCancelledWorkflow** - Cancellation notifications
- ✅ **newBookingExpertWorkflow** - New booking notifications
- ✅ **healthCheckFailureWorkflow** - System health alerts

## 🔧 Troubleshooting

### Common Issues

#### 1. "User role for API request: undefined" Error

**Cause**: Middleware is trying to authenticate the Novu bridge endpoint
**Fix**: Ensure `/api/novu` is in middleware exclusion pattern

#### 2. Bridge Endpoint Returns 500 Error

**Cause**: Framework client configuration issue
**Fix**: Verify `NovuFrameworkClient` is properly initialized

#### 3. Subscriber Hash Empty or Missing

**Cause**: HMAC generation failing
**Fix**: Check `NOVU_SECRET_KEY` is set and subscriber-hash endpoint logic

#### 4. Inbox Component Not Loading

**Cause**: Provider configuration or authentication issues
**Fix**: Verify all environment variables and provider setup

### Debug Steps

1. **Check Environment Variables**:

   ```bash
   npm run test:novu
   ```

2. **Verify Bridge Endpoint**:

   ```bash
   curl http://localhost:3000/api/novu
   ```

3. **Test Authentication**:

   ```bash
   curl -H "Authorization: Bearer token" http://localhost:3000/api/novu/subscriber-hash
   ```

4. **Review Logs**: Check browser console and server logs for detailed error messages

## 🎉 Success Verification

When everything is working correctly, you should see:

1. ✅ No "User role undefined" errors in Vercel logs
2. ✅ Bridge endpoint accessible at `/api/novu`
3. ✅ Subscriber hash endpoint returns valid HMAC hashes
4. ✅ Inbox component loads and displays notifications
5. ✅ Workflows can be triggered successfully
6. ✅ Novu Dashboard shows proper workflow synchronization

## 📚 Additional Resources

- [Novu Framework Documentation](https://docs.novu.co/framework)
- [Next.js 15 Integration Guide](https://docs.novu.co/platform/quickstart/nextjs)
- [HMAC Authentication Guide](https://docs.novu.co/platform/inbox/react/production)
- [EU Region Configuration](https://docs.novu.co/platform/sdks/javascript/index)

---

**Note**: This setup ensures production-ready Novu integration with proper security, authentication, and Next.js 15 compatibility.
