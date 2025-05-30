# Centralized Environment Configuration

## Overview

The Eleva Care application now uses a centralized environment configuration system located at `config/env.ts`. This system provides typed access to all environment variables, validation utilities, and helper functions to improve maintainability and reduce scattered environment variable access throughout the codebase.

## Features

✅ **Centralized Management**: All environment variables in one place  
✅ **Type Safety**: Typed access to configuration values  
✅ **Validation System**: Validate environment variables by category  
✅ **Helper Functions**: Convenient utilities for common operations  
✅ **Fallback Values**: Sensible defaults for development  
✅ **Environment Detection**: Easy development/production checks

## File Structure

```
config/
├── env.ts              # Centralized environment configuration
├── stripe.ts           # Stripe-specific configuration
└── qstash.ts           # QStash-specific configuration
```

## Usage Examples

### Basic Configuration Access

```typescript
import { ENV_CONFIG } from '@/config/env';

// Access environment variables
const databaseUrl = ENV_CONFIG.DATABASE_URL;
const apiKey = ENV_CONFIG.GRAVATAR_API_KEY;
const nodeEnv = ENV_CONFIG.NODE_ENV;
```

### Using Helper Functions

```typescript
import { ENV_HELPERS } from '@/config/env';

// Environment detection
if (ENV_HELPERS.isDevelopment()) {
  console.log('Running in development mode');
}

// API key checking
if (ENV_HELPERS.hasGravatarApiKey()) {
  // Use enhanced Gravatar features
}

// Get base URL with fallbacks
const baseUrl = ENV_HELPERS.getBaseUrl();

// Get environment summary
const summary = ENV_HELPERS.getEnvironmentSummary();
```

### Environment Validation

```typescript
import { ENV_VALIDATORS } from '@/config/env';

// Validate critical environment variables
const validation = ENV_VALIDATORS.critical();
if (!validation.isValid) {
  console.error('Missing critical environment variables:', validation.missingVars);
  process.exit(1);
}

// Validate specific categories
const stripeValidation = ENV_VALIDATORS.stripe();
const qstashValidation = ENV_VALIDATORS.qstash();
const emailValidation = ENV_VALIDATORS.email();
```

## Available Environment Variables

### Core Application

| Variable               | Description           | Required | Default       |
| ---------------------- | --------------------- | -------- | ------------- |
| `NODE_ENV`             | Node environment      | No       | `development` |
| `NEXT_PUBLIC_APP_URL`  | Main application URL  | No       | -             |
| `NEXT_PUBLIC_BASE_URL` | Base URL fallback     | No       | -             |
| `VERCEL_URL`           | Vercel deployment URL | No       | -             |

### Database

| Variable                | Description                   | Required | Default |
| ----------------------- | ----------------------------- | -------- | ------- |
| `DATABASE_URL`          | Primary database connection   | Yes      | -       |
| `AUDITLOG_DATABASE_URL` | Audit log database connection | Yes      | -       |
| `KV_REST_API_URL`       | KV database URL               | Yes      | -       |
| `KV_REST_API_TOKEN`     | KV database token             | Yes      | -       |

### Authentication

| Variable           | Description                 | Required | Default |
| ------------------ | --------------------------- | -------- | ------- |
| `CLERK_SECRET_KEY` | Clerk authentication secret | Yes      | -       |

### Payment Processing

| Variable                         | Description             | Required | Default            |
| -------------------------------- | ----------------------- | -------- | ------------------ |
| `STRIPE_SECRET_KEY`              | Stripe secret key       | Yes      | -                  |
| `STRIPE_API_VERSION`             | Stripe API version      | No       | `2025-04-30.basil` |
| `STRIPE_PLATFORM_FEE_PERCENTAGE` | Platform fee percentage | No       | `0.15`             |

### Background Jobs

| Variable                     | Description             | Required | Default |
| ---------------------------- | ----------------------- | -------- | ------- |
| `QSTASH_TOKEN`               | QStash API token        | Yes      | -       |
| `QSTASH_CURRENT_SIGNING_KEY` | QStash signing key      | Yes      | -       |
| `QSTASH_NEXT_SIGNING_KEY`    | QStash next signing key | Yes      | -       |
| `QSTASH_URL`                 | QStash endpoint URL     | No       | -       |

### External Services

| Variable                     | Description            | Required | Default                    |
| ---------------------------- | ---------------------- | -------- | -------------------------- |
| `RESEND_API_KEY`             | Email service API key  | Yes      | -                          |
| `RESEND_EMAIL_BOOKINGS_FROM` | From email address     | No       | -                          |
| `GRAVATAR_API_KEY`           | Gravatar API key       | No       | -                          |
| `DUB_API_KEY`                | URL shortening service | No       | -                          |
| `DUB_API_ENDPOINT`           | Dub API endpoint       | No       | `https://api.dub.co/links` |
| `DUB_DEFAULT_DOMAIN`         | Default short domain   | No       | `go.eleva.care`            |

### Google Integration

| Variable                     | Description            | Required | Default |
| ---------------------------- | ---------------------- | -------- | ------- |
| `GOOGLE_OAUTH_CLIENT_ID`     | Google OAuth client ID | No       | -       |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth secret    | No       | -       |
| `GOOGLE_OAUTH_REDIRECT_URL`  | OAuth redirect URL     | No       | -       |

### Security

| Variable         | Description           | Required | Default |
| ---------------- | --------------------- | -------- | ------- |
| `ENCRYPTION_KEY` | Data encryption key   | No       | -       |
| `CRON_API_KEY`   | Cron job security key | No       | -       |

### Analytics

| Variable                   | Description           | Required | Default |
| -------------------------- | --------------------- | -------- | ------- |
| `NEXT_PUBLIC_POSTHOG_KEY`  | PostHog analytics key | No       | -       |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host URL      | No       | -       |

## Validation Categories

### Critical Validators

```typescript
// Validates essential services for application startup
ENV_VALIDATORS.critical(); // Database + Auth + Stripe
ENV_VALIDATORS.database(); // Database connections
ENV_VALIDATORS.auth(); // Authentication service
ENV_VALIDATORS.stripe(); // Payment processing
```

### Optional Validators

```typescript
// Validates optional features
ENV_VALIDATORS.qstash(); // Background job processing
ENV_VALIDATORS.email(); // Email notifications
ENV_VALIDATORS.googleOAuth(); // Google calendar integration
```

## Helper Functions

### Environment Detection

```typescript
ENV_HELPERS.isDevelopment(); // true if NODE_ENV === 'development'
ENV_HELPERS.isProduction(); // true if NODE_ENV === 'production'
ENV_HELPERS.isTest(); // true if NODE_ENV === 'test'
```

### Service Availability

```typescript
ENV_HELPERS.hasGravatarApiKey(); // Check if Gravatar API is configured
ENV_HELPERS.getGravatarApiKey(); // Get Gravatar API key or undefined
```

### URL Management

```typescript
ENV_HELPERS.getBaseUrl(); // Get base URL with intelligent fallbacks
```

### System Status

```typescript
const summary = ENV_HELPERS.getEnvironmentSummary();
// Returns:
// {
//   nodeEnv: string,
//   isDevelopment: boolean,
//   isProduction: boolean,
//   hasDatabase: boolean,
//   hasAuth: boolean,
//   hasStripe: boolean,
//   hasQStash: boolean,
//   hasEmail: boolean,
//   hasGravatar: boolean,
//   baseUrl: string
// }
```

## Migration Guide

### Before (Scattered Usage)

```typescript
// Throughout the codebase
const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
const isDev = process.env.NODE_ENV === 'development';
const apiKey = process.env.GRAVATAR_API_KEY;
```

### After (Centralized)

```typescript
import { ENV_CONFIG, ENV_HELPERS } from '@/config/env';

// Consistent access
const stripeKey = ENV_CONFIG.STRIPE_SECRET_KEY;
const isDev = ENV_HELPERS.isDevelopment();
const apiKey = ENV_HELPERS.getGravatarApiKey();
```

### Migration Steps

1. **Import centralized config**:

   ```typescript
   import { ENV_CONFIG, ENV_HELPERS, ENV_VALIDATORS } from '@/config/env';
   ```

2. **Replace direct process.env usage**:

   ```typescript
   // Old
   const key = process.env.SOME_KEY || '';

   // New
   const key = ENV_CONFIG.SOME_KEY;
   ```

3. **Use helper functions**:

   ```typescript
   // Old
   const isDev = process.env.NODE_ENV === 'development';

   // New
   const isDev = ENV_HELPERS.isDevelopment();
   ```

4. **Add validation where needed**:
   ```typescript
   // In startup code
   const validation = ENV_VALIDATORS.critical();
   if (!validation.isValid) {
     throw new Error(validation.message);
   }
   ```

## Best Practices

### 1. Use Typed Access

```typescript
// ✅ Good - Type-safe access
import { ENV_CONFIG } from '@/config/env';
const apiKey = ENV_CONFIG.GRAVATAR_API_KEY;

// ❌ Avoid - Direct environment access
const apiKey = process.env.GRAVATAR_API_KEY;
```

### 2. Validate Critical Variables

```typescript
// ✅ Good - Validate on startup
import { ENV_VALIDATORS } from '@/config/env';

const validation = ENV_VALIDATORS.critical();
if (!validation.isValid) {
  console.error('Critical environment variables missing:', validation.missingVars);
  process.exit(1);
}
```

### 3. Use Helper Functions

```typescript
// ✅ Good - Use helpers for common operations
import { ENV_HELPERS } from '@/config/env';

if (ENV_HELPERS.hasGravatarApiKey()) {
  // Enable enhanced features
}

// ❌ Avoid - Manual checks
if (process.env.GRAVATAR_API_KEY && process.env.GRAVATAR_API_KEY.length > 0) {
  // Enable enhanced features
}
```

### 4. Environment-Specific Logic

```typescript
// ✅ Good - Clear environment detection
import { ENV_HELPERS } from '@/config/env';

if (ENV_HELPERS.isDevelopment()) {
  console.log('Debug info');
}

// ❌ Avoid - String comparisons
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info');
}
```

## Adding New Environment Variables

### 1. Add to ENV_CONFIG

```typescript
export const ENV_CONFIG = {
  // ... existing config
  NEW_API_KEY: process.env.NEW_API_KEY || '',
} as const;
```

### 2. Add Helper Function (if needed)

```typescript
export const ENV_HELPERS = {
  // ... existing helpers
  hasNewApiKey(): boolean {
    return Boolean(ENV_CONFIG.NEW_API_KEY);
  },

  getNewApiKey(): string | undefined {
    return ENV_CONFIG.NEW_API_KEY || undefined;
  },
} as const;
```

### 3. Add Validator (if critical)

```typescript
export const ENV_VALIDATORS = {
  // ... existing validators
  newService(): EnvValidationResult {
    const missingVars: string[] = [];

    if (!ENV_CONFIG.NEW_API_KEY) missingVars.push('NEW_API_KEY');

    return {
      isValid: missingVars.length === 0,
      message:
        missingVars.length > 0
          ? `Missing new service environment variables: ${missingVars.join(', ')}`
          : 'New service configuration is valid',
      missingVars,
    };
  },
} as const;
```

### 4. Update Critical Validator (if applicable)

```typescript
critical(): EnvValidationResult {
  const criticalValidations = [
    this.database(),
    this.auth(),
    this.stripe(),
    this.newService(), // Add if critical
  ];
  // ... rest of implementation
}
```

## Benefits

1. **Maintainability**: All environment variables in one place
2. **Type Safety**: TypeScript support for all configuration
3. **Validation**: Catch missing variables early
4. **Consistency**: Uniform access patterns across the codebase
5. **Developer Experience**: Helper functions for common operations
6. **Documentation**: Self-documenting configuration structure
7. **Testing**: Easy to mock and test configuration

The centralized environment configuration system improves code quality, reduces bugs, and makes the application more maintainable!
