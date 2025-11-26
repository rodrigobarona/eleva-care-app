# Better Stack Error Tracking Integration

This document describes the Better Stack Error Tracking integration using the Sentry SDK for Next.js 16.

## Overview

Better Stack Error Tracking captures and monitors errors across your entire application:

- **Client-side errors**: Browser errors, React errors, API call failures
- **Server-side errors**: API route errors, server component errors, database errors
- **Edge runtime errors**: Middleware errors, edge function errors

Errors are sent to Better Stack's Sentry-compatible ingestion endpoint for centralized error management and analysis.

## Configuration

### Environment Variables

Add the following to your `.env.local` file:

```bash
# Better Stack Error Tracking (Sentry SDK)
NEXT_PUBLIC_SENTRY_DSN=https://f5pge1tAEU6Zkr9Yd8HeBRYs@eu-nbg-2.betterstackdata.com/1606629

# Optional: Override environment name
SENTRY_ENVIRONMENT=production

# Optional: Set custom release version (auto-detected from Git SHA on Vercel)
SENTRY_RELEASE=v1.0.0

# Optional: Enable source map upload to Sentry (not required for Better Stack)
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token
```

**Note**: The DSN is already set in `config/env.ts` with the provided Better Stack endpoint. You only need to override it if using a different application.

### Files Created

The integration adds the following files:

1. **`sentry.client.config.ts`** - Client-side error tracking configuration
2. **`sentry.server.config.ts`** - Server-side error tracking configuration
3. **`sentry.edge.config.ts`** - Edge runtime error tracking configuration
4. **`instrumentation.ts`** - Server instrumentation loader
5. **`config/betterstack.ts`** - Updated with error tracking configuration

### Configuration Files

#### Client Configuration (`sentry.client.config.ts`)

Tracks errors in the browser:

- React component errors
- API call failures
- Network errors
- User interactions

Features:

- **Session Replay**: Records user sessions for debugging (10% of sessions, 100% of error sessions)
- **Performance Monitoring**: Tracks page load times and API response times
- **Privacy**: Masks all text and blocks media in session replays

#### Server Configuration (`sentry.server.config.ts`)

Tracks errors on the server:

- API route errors
- Server component errors
- Database errors
- Server action failures

Features:

- **HTTP Integration**: Captures HTTP request/response data
- **Node Profiling**: Performance profiling for server-side code
- **Context Enhancement**: Adds server environment details to errors

#### Edge Configuration (`sentry.edge.config.ts`)

Tracks errors in edge runtime:

- Middleware errors
- Edge function errors
- Edge API route errors

Features:

- **Lightweight**: Optimized for edge runtime constraints
- **Fast**: Minimal overhead for edge functions

## Usage

### Automatic Error Tracking

Errors are automatically captured in all environments:

```typescript
// ❌ This error will be automatically tracked
throw new Error('Something went wrong');

// ❌ Unhandled promise rejections are tracked
fetch('/api/data').then(response => {
  throw new Error('Failed to process response');
});

// ❌ React component errors are tracked
function MyComponent() {
  if (error) throw new Error('Component error');
  return <div>Content</div>;
}
```

### Manual Error Tracking

Use Sentry's `captureException` for explicit error tracking:

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  // Your code
  await riskyOperation();
} catch (error) {
  // Capture error with additional context
  Sentry.captureException(error, {
    tags: {
      section: 'payment',
      action: 'process',
    },
    extra: {
      userId: user.id,
      amount: payment.amount,
    },
  });
}
```

### Custom Error Context

Add custom context to all errors:

```typescript
import * as Sentry from '@sentry/nextjs';

// Set user context
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
});

// Set custom tags
Sentry.setTag('page', 'checkout');
Sentry.setTag('experiment', 'new-checkout-flow');

// Set custom context
Sentry.setContext('payment', {
  provider: 'stripe',
  amount: 1000,
  currency: 'EUR',
});
```

### Breadcrumbs

Add breadcrumbs to track user actions leading to errors:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.addBreadcrumb({
  category: 'payment',
  message: 'User initiated payment',
  level: 'info',
  data: {
    amount: 1000,
    currency: 'EUR',
  },
});
```

### Performance Monitoring

Track custom performance metrics:

```typescript
import * as Sentry from '@sentry/nextjs';

// Start a transaction
const transaction = Sentry.startTransaction({
  name: 'Process Payment',
  op: 'payment.process',
});

// Perform operation
await processPayment();

// End transaction
transaction.finish();

// Or use spans for more granular tracking
const span = transaction.startChild({
  op: 'stripe.charge',
  description: 'Create Stripe charge',
});

await stripe.charges.create({...});
span.finish();
```

## Testing

### Test Client-Side Error Tracking

Create a test page or button to trigger a client error:

```typescript
'use client';

export function TestErrorButton() {
  return (
    <button
      onClick={() => {
        throw new Error('Test client error from Better Stack integration');
      }}
    >
      Trigger Client Error
    </button>
  );
}
```

### Test Server-Side Error Tracking

Create a test API route:

```typescript
// app/api/test-error/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  throw new Error('Test server error from Better Stack integration');
  return NextResponse.json({ error: 'This should not be reached' });
}
```

### Test Server Action Error Tracking

Create a server action that throws an error:

```typescript
'use server';

export async function testServerAction() {
  throw new Error('Test server action error from Better Stack integration');
}
```

### Verify Error Tracking

After triggering test errors:

1. Go to [Better Stack Errors Dashboard](https://errors.betterstack.com/)
2. Navigate to your application
3. Check the **Errors** tab
4. Verify that test errors appear with:
   - Correct error message
   - Stack trace
   - Environment (development/production)
   - User context (if available)
   - Session replay (for client errors)

## Configuration Options

### Sample Rates

Adjust sample rates in the respective config files:

```typescript
// sentry.client.config.ts
{
  // Performance monitoring sample rate
  tracesSampleRate: 0.1, // 10% of transactions (reduce in production)

  // Session replay sample rates
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of error sessions
}
```

### Error Filtering

Filter out specific errors in the `beforeSend` hook:

```typescript
// sentry.client.config.ts
beforeSend(event, hint) {
  const error = hint.originalException;

  // Filter out specific error types
  if (error instanceof TypeError && error.message.includes('Network request failed')) {
    return null; // Don't send to Better Stack
  }

  return event;
}
```

### Ignore Patterns

Add patterns to ignore specific errors:

```typescript
// sentry.client.config.ts
{
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],

  denyUrls: [
    /chrome-extension:/i,
    /moz-extension:/i,
  ],
}
```

## Environment-Specific Behavior

### Development

- **Error tracking**: Enabled with debug logging
- **Sample rate**: 100% (all transactions tracked)
- **Session replay**: Enabled
- **Source maps**: Not uploaded

### Production

- **Error tracking**: Enabled (silent)
- **Sample rate**: 10% (configurable)
- **Session replay**: 10% of sessions, 100% of error sessions
- **Source maps**: Optional (requires auth token)

### Test

- **Error tracking**: Disabled
- All Sentry instrumentation is bypassed

## Best Practices

### 1. Don't Track Expected Errors

Filter out errors that are part of normal operation:

```typescript
// ❌ Don't track
if (!user) {
  throw new Error('User not found'); // This is expected
}

// ✅ Do track
if (!user) {
  return { error: 'User not found' }; // Handle gracefully
}

// Only track unexpected errors
if (databaseError) {
  Sentry.captureException(databaseError); // This is unexpected
}
```

### 2. Add Meaningful Context

Always add context to help debug errors:

```typescript
Sentry.captureException(error, {
  tags: {
    feature: 'payment',
    paymentProvider: 'stripe',
  },
  extra: {
    userId: user.id,
    paymentIntentId: intent.id,
    amount: intent.amount,
  },
});
```

### 3. Use Error Boundaries

Wrap components with error boundaries to catch React errors:

```typescript
import { ErrorBoundary } from 'react-error-boundary';
import * as Sentry from '@sentry/nextjs';

function MyErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      fallback={<ErrorFallback />}
      onError={(error, info) => {
        Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: info.componentStack,
            },
          },
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### 4. Clean Up Sensitive Data

Remove sensitive information before sending to Better Stack:

```typescript
beforeSend(event, hint) {
  // Remove sensitive headers
  if (event.request?.headers) {
    delete event.request.headers['Authorization'];
    delete event.request.headers['Cookie'];
  }

  // Scrub sensitive data from context
  if (event.contexts?.payment) {
    delete event.contexts.payment.cardNumber;
    delete event.contexts.payment.cvv;
  }

  return event;
}
```

## Troubleshooting

### Errors Not Appearing in Better Stack

1. **Check DSN**: Verify `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. **Check environment**: Error tracking is disabled in test environment
3. **Check network**: Open browser DevTools > Network > filter for "betterstackdata.com"
4. **Check filters**: Review `ignoreErrors` and `beforeSend` hooks

### Too Many Errors

1. **Adjust sample rate**: Reduce `tracesSampleRate` in config files
2. **Add filters**: Use `ignoreErrors` to filter out noise
3. **Fix root causes**: Address common errors instead of just tracking them

### Missing Context

1. **Set user context**: Call `Sentry.setUser()` after authentication
2. **Add tags**: Use `Sentry.setTag()` for important metadata
3. **Add breadcrumbs**: Track user actions with `Sentry.addBreadcrumb()`

### Source Maps Not Working

1. **Set auth token**: Add `SENTRY_AUTH_TOKEN` to environment variables
2. **Configure org/project**: Set `SENTRY_ORG` and `SENTRY_PROJECT`
3. **Enable upload**: Set `disableSourceMapUpload: false` in `next.config.ts`

**Note**: Source maps are optional for Better Stack. They improve stack traces but are not required.

## Integration with Other Tools

### Clerk Authentication

Automatically set user context after authentication:

```typescript
import * as Sentry from '@sentry/nextjs';
import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';

export function UserTracker() {
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        username: user.fullName || undefined,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);

  return null;
}
```

### PostHog Analytics

Correlate errors with analytics events:

```typescript
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

Sentry.setTag('posthog_session_id', posthog.get_session_id());
Sentry.setContext('analytics', {
  distinctId: posthog.get_distinct_id(),
  sessionId: posthog.get_session_id(),
});
```

## Resources

- [Better Stack Error Tracking Docs](https://betterstack.com/docs/errors/)
- [Sentry Next.js SDK Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Better Stack Sentry Integration](https://betterstack.com/docs/errors/collecting-errors/sentry-sdk/)
- [Better Stack Dashboard](https://errors.betterstack.com/)

## Support

For issues with:

- **Better Stack**: [Better Stack Support](https://betterstack.com/support)
- **Sentry SDK**: [Sentry Discord](https://discord.gg/sentry)
- **This integration**: Check this documentation or open an issue
