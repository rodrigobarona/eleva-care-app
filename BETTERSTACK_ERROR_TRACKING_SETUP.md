# Better Stack Error Tracking - Setup Complete ✅

## What Was Integrated

Better Stack Error Tracking has been successfully integrated into your Next.js 16 application using the Sentry SDK. This provides comprehensive error monitoring across:

- ✅ **Client-side** (Browser errors, React errors, API failures)
- ✅ **Server-side** (API routes, server components, server actions)
- ✅ **Edge runtime** (Middleware, edge functions)

## Files Created/Modified

### New Files Created

1. **`sentry.client.config.ts`** - Client-side error tracking configuration
2. **`sentry.server.config.ts`** - Server-side error tracking configuration
3. **`sentry.edge.config.ts`** - Edge runtime error tracking configuration
4. **`instrumentation.ts`** - Server instrumentation loader for Next.js 16
5. **`app/api/test-sentry/route.ts`** - Test API route for error tracking verification
6. **`docs/09-integrations/betterstack-error-tracking.md`** - Complete integration documentation

### Modified Files

1. **`config/env.ts`** - Added Sentry/Better Stack environment variables
2. **`config/betterstack.ts`** - Added error tracking configuration
3. **`next.config.ts`** - Integrated Sentry webpack plugin
4. **`package.json`** - Added `@sentry/nextjs` dependency (v10.27.0)

## Environment Configuration

The following environment variables are configured:

```bash
# Better Stack Error Tracking (Already configured with your DSN)
NEXT_PUBLIC_SENTRY_DSN=https://f5pge1tAEU6Zkr9Yd8HeBRYs@eu-nbg-2.betterstackdata.com/1606629

# Auto-detected from environment
SENTRY_ENVIRONMENT=development|production
SENTRY_RELEASE=<git-commit-sha>
```

**Note**: The DSN is already configured in `config/env.ts`. You don't need to add it to `.env.local` unless you want to override it.

## Next Steps

### 1. Test the Integration

#### Option A: Test with the API Route

Visit these URLs in your browser or use curl:

```bash
# Basic error test
curl http://localhost:3000/api/test-sentry

# Error with custom context
curl http://localhost:3000/api/test-sentry?type=custom

# Async error test
curl http://localhost:3000/api/test-sentry?type=async

# Handled exception (captured, not thrown)
curl http://localhost:3000/api/test-sentry?type=handled
```

#### Option B: Trigger a Client Error

Add this to any client component temporarily:

```typescript
'use client';

export function TestError() {
  return (
    <button onClick={() => {
      throw new Error('Test client error from Better Stack');
    }}>
      Trigger Test Error
    </button>
  );
}
```

### 2. Verify in Better Stack

1. Go to [Better Stack Errors Dashboard](https://errors.betterstack.com/)
2. Navigate to your application (ID: 1606629)
3. Check the **Errors** tab
4. You should see your test errors with:
   - Error message and stack trace
   - Environment (development/production)
   - Runtime (client/server/edge)
   - User context (if authenticated)
   - Session replay (for client errors)

### 3. Deploy to Production

When deploying to production:

1. **Vercel**: Environment variables are automatically detected
   - `SENTRY_ENVIRONMENT` will be set to "production"
   - `SENTRY_RELEASE` will be set to the Git commit SHA

2. **Other platforms**: Add environment variables:

   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://f5pge1tAEU6Zkr9Yd8HeBRYs@eu-nbg-2.betterstackdata.com/1606629
   SENTRY_ENVIRONMENT=production
   ```

3. **Optional - Source Maps**: For better stack traces, add:
   ```bash
   SENTRY_ORG=your-org
   SENTRY_PROJECT=your-project
   SENTRY_AUTH_TOKEN=your-auth-token
   ```
   **Note**: Source maps are optional for Better Stack. They improve debugging but aren't required.

### 4. Clean Up Test Routes (Optional)

After verifying the integration works, you may want to remove the test route:

```bash
rm app/api/test-sentry/route.ts
```

Or protect it to only work in development:

```typescript
// Add to the top of app/api/test-sentry/route.ts
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
}
```

## Usage Examples

### Automatic Error Tracking

All uncaught errors are automatically tracked:

```typescript
// This will be automatically tracked
throw new Error('Something went wrong');
```

### Manual Error Tracking

Capture errors explicitly with additional context:

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      feature: 'payment',
      action: 'process',
    },
    extra: {
      userId: user.id,
      amount: 1000,
    },
  });
}
```

### Set User Context

Track which user experienced an error:

```typescript
import * as Sentry from '@sentry/nextjs';

// After user signs in
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
});

// After user signs out
Sentry.setUser(null);
```

### Add Breadcrumbs

Track user actions leading to an error:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.addBreadcrumb({
  category: 'payment',
  message: 'User initiated checkout',
  level: 'info',
  data: {
    amount: 1000,
    items: 3,
  },
});
```

## Features Enabled

### Client-Side Features

- ✅ **Automatic error capture**: All uncaught errors and promise rejections
- ✅ **Session Replay**: Records 10% of sessions, 100% of error sessions
- ✅ **Performance monitoring**: Tracks page loads and API calls
- ✅ **Privacy protection**: Masks sensitive data in replays
- ✅ **Browser tracing**: Tracks fetch and XHR requests

### Server-Side Features

- ✅ **API route errors**: Captures errors in API routes
- ✅ **Server component errors**: Tracks RSC errors
- ✅ **Server action errors**: Monitors server action failures
- ✅ **HTTP integration**: Captures request/response data
- ✅ **Node profiling**: Performance profiling

### Edge Runtime Features

- ✅ **Middleware errors**: Captures middleware failures
- ✅ **Edge function errors**: Monitors edge API routes
- ✅ **Lightweight**: Optimized for edge constraints

## Configuration

### Sample Rates

Current configuration (adjust in respective config files):

```typescript
// Production
tracesSampleRate: 0.1 (10% of transactions)
replaysSessionSampleRate: 0.1 (10% of sessions)
replaysOnErrorSampleRate: 1.0 (100% of error sessions)

// Development
tracesSampleRate: 1.0 (100% of transactions)
replaysSessionSampleRate: 0.1 (10% of sessions)
replaysOnErrorSampleRate: 1.0 (100% of error sessions)
```

### Error Filtering

Certain errors are automatically filtered:

- **Browser extensions**: Errors from extensions are ignored
- **Network errors**: Expected network failures in development
- **Navigation errors**: User-initiated navigation cancellations
- **Webhook errors**: Legitimate webhook signature failures
- **Expected redirects**: Next.js NEXT_REDIRECT errors

### Environment Behavior

- **Development**: All errors tracked with debug logging
- **Production**: 10% sample rate, optimized for performance
- **Test**: Error tracking disabled

## Documentation

For detailed documentation, see:

- **`docs/09-integrations/betterstack-error-tracking.md`** - Complete integration guide with examples

## Troubleshooting

### Errors Not Appearing

1. Check that `NEXT_PUBLIC_SENTRY_DSN` is set (already configured in `config/env.ts`)
2. Verify you're not in test environment (`NODE_ENV !== 'test'`)
3. Check browser DevTools > Network for requests to `betterstackdata.com`
4. Review `ignoreErrors` patterns in config files

### Too Many Errors

1. Reduce `tracesSampleRate` in production
2. Add patterns to `ignoreErrors` array
3. Filter errors in `beforeSend` hook

### Missing Stack Traces

1. Ensure source maps are built (`pnpm build`)
2. Optional: Upload source maps (add `SENTRY_AUTH_TOKEN`)
3. Check that `hideSourceMaps: true` is set (prevents exposure to users)

## Resources

- [Better Stack Dashboard](https://errors.betterstack.com/team/t0/applications/1606629)
- [Better Stack Documentation](https://betterstack.com/docs/errors/)
- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

## Support

For issues:

- **Better Stack**: [Better Stack Support](https://betterstack.com/support)
- **Integration**: See `docs/09-integrations/betterstack-error-tracking.md`
- **Sentry SDK**: [Sentry Discord](https://discord.gg/sentry)

---

**Integration Status**: ✅ Complete and Ready for Testing

**Next Action**: Test the integration using the test API route or by triggering a client error, then verify errors appear in your Better Stack dashboard.
