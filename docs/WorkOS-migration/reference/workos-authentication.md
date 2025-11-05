# WorkOS Authentication Integration

## Overview

This document covers the integration of WorkOS AuthKit for authentication in Eleva Care. WorkOS provides enterprise-grade authentication with built-in support for SSO, Directory Sync, and RBAC - essential features for our B2C and future B2B models.

**Last Updated:** November 3, 2025  
**Status:** Active  
**Owner:** Technical Lead

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [WorkOS Setup](#workos-setup)
3. [Authentication Flow](#authentication-flow)
4. [Session Management](#session-management)
5. [RBAC Integration](#rbac-integration)
6. [API Reference](#api-reference)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Authentication Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     Authentication Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User initiates sign-in                                  │
│     └─> Next.js redirects to WorkOS AuthKit                 │
│                                                              │
│  2. WorkOS AuthKit handles authentication                   │
│     ├─> Email/Password                                      │
│     ├─> Google OAuth                                        │
│     ├─> Magic Link                                          │
│     └─> SSO (for enterprise customers)                      │
│                                                              │
│  3. WorkOS issues JWT with claims:                          │
│     ├─> sub (user ID)                                       │
│     ├─> email                                               │
│     ├─> org_id (if org context)                            │
│     ├─> role (from RBAC)                                    │
│     └─> custom claims                                       │
│                                                              │
│  4. Next.js stores session in encrypted cookie              │
│     └─> HTTP-only, Secure, SameSite=Lax                     │
│                                                              │
│  5. Subsequent requests include JWT                         │
│     ├─> Middleware validates session                        │
│     └─> Neon Auth validates JWT via JWKS                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

- **WorkOS AuthKit**: Hosted authentication UI and API
- **WorkOS RBAC**: Role-based access control for organizations
- **WorkOS Audit Logs**: Authentication event tracking
- **Next.js Middleware**: Session validation and route protection
- **Neon Auth**: JWT validation at database layer for RLS

---

## WorkOS Setup

### 1. Create WorkOS Account

```bash
# Visit https://dashboard.workos.com/signup
# Create account and verify email
```

### 2. Create Environment

Development and Production environments:

```bash
# Development Environment
Name: Eleva Care - Development
Redirect URIs:
  - http://localhost:3000/auth/callback
  - http://localhost:3000/api/auth/callback

# Production Environment
Name: Eleva Care - Production
Redirect URIs:
  - https://eleva.care/auth/callback
  - https://eleva.care/api/auth/callback
```

### 3. Configure Authentication Providers

#### Email/Password Authentication

```typescript
// Enabled by default in WorkOS
// No additional configuration required
```

#### Google OAuth

```bash
# In WorkOS Dashboard:
# 1. Navigate to Authentication → Social Providers
# 2. Enable Google
# 3. Add OAuth credentials:

Client ID: [From Google Cloud Console]
Client Secret: [From Google Cloud Console]

# Google Cloud Console Setup:
# https://console.cloud.google.com/apis/credentials
# Create OAuth 2.0 Client ID
# Authorized redirect URIs:
# - https://api.workos.com/sso/oauth/google/callback
```

#### Magic Link

```typescript
// Enabled by default
// Configure email provider (Resend) for delivery
```

### 4. Configure RBAC Roles

```typescript
// In WorkOS Dashboard → RBAC → Roles
// Create the following roles:

Roles:
  - owner:
      description: "Full control of organization"
      permissions: ["*"]

  - admin:
      description: "Manage organization, no billing access"
      permissions: [
        "org:read",
        "org:update",
        "members:read",
        "members:write",
        "bookings:*",
        "profiles:*"
      ]

  - member:
      description: "Basic member access"
      permissions: [
        "org:read",
        "bookings:read",
        "bookings:create",
        "profiles:read"
      ]

  - billing_admin:
      description: "Billing and subscription management only"
      permissions: [
        "org:read",
        "billing:*",
        "subscriptions:*"
      ]
```

### 5. Environment Variables

```bash
# .env.local (Development)
WORKOS_API_KEY=sk_test_...
WORKOS_CLIENT_ID=client_...
WORKOS_COOKIE_PASSWORD=complex-password-at-least-32-characters
WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback

# .env.production (Production)
WORKOS_API_KEY=sk_prod_...
WORKOS_CLIENT_ID=client_...
WORKOS_COOKIE_PASSWORD=[Generated secure password]
WORKOS_REDIRECT_URI=https://eleva.care/auth/callback
```

---

## Authentication Flow

### Sign-In Flow

```typescript
// app/sign-in/page.tsx
import { getAuthorizationUrl } from '@/lib/auth/workos-client';
import { redirect } from 'next/navigation';

export default function SignInPage() {
  async function handleSignIn() {
    'use server';

    // Generate WorkOS authorization URL
    const authUrl = await getAuthorizationUrl({
      provider: 'authkit',
      redirectUri: process.env.WORKOS_REDIRECT_URI!,
      state: JSON.stringify({ returnTo: '/dashboard' }),
    });

    redirect(authUrl);
  }

  return (
    <form action={handleSignIn}>
      <button type="submit">Sign In with WorkOS</button>
    </form>
  );
}
```

### Callback Handler

```typescript
// app/auth/callback/route.ts
import { setSession } from '@/lib/auth/workos-session';
import { workos } from '@/lib/integrations/workos/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  if (!code) {
    return NextResponse.redirect(new URL('/sign-in?error=no_code', req.url));
  }

  try {
    // Exchange code for tokens
    const { user, organizationId, accessToken, refreshToken } =
      await workos.userManagement.authenticateWithCode({
        code,
        clientId: process.env.WORKOS_CLIENT_ID!,
      });

    // Create session
    await setSession({
      userId: user.id,
      email: user.email,
      organizationId,
      accessToken,
      refreshToken,
    });

    // Parse return URL from state
    const { returnTo } = JSON.parse(state || '{}');

    return NextResponse.redirect(new URL(returnTo || '/dashboard', req.url));
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/sign-in?error=auth_failed', req.url));
  }
}
```

### Sign-Out Flow

```typescript
// app/api/auth/signout/route.ts
import { clearSession } from '@/lib/auth/workos-session';
import { NextResponse } from 'next/server';

export async function POST() {
  await clearSession();
  return NextResponse.redirect(new URL('/sign-in', req.url));
}
```

---

## Session Management

### Session Structure

```typescript
// lib/auth/workos-session.ts
export interface WorkOSSession {
  userId: string; // WorkOS user ID (sub claim)
  email: string; // User email
  organizationId?: string; // Current org context
  role?: string; // WorkOS RBAC role
  accessToken: string; // JWT for API calls
  refreshToken: string; // For token refresh
  expiresAt: number; // Token expiration
}
```

### Setting Session

```typescript
import { sealData } from 'iron-session';
import { cookies } from 'next/headers';

export async function setSession(session: WorkOSSession) {
  const sealed = await sealData(session, {
    password: process.env.WORKOS_COOKIE_PASSWORD!,
    ttl: 60 * 60 * 24 * 7, // 7 days
  });

  (await cookies()).set('workos_session', sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}
```

### Getting Session

```typescript
import { unsealData } from 'iron-session';
import { cookies } from 'next/headers';

export async function getSession(): Promise<WorkOSSession | null> {
  const sessionCookie = (await cookies()).get('workos_session');

  if (!sessionCookie) {
    return null;
  }

  try {
    const session = await unsealData<WorkOSSession>(sessionCookie.value, {
      password: process.env.WORKOS_COOKIE_PASSWORD!,
    });

    // Check if token expired
    if (Date.now() >= session.expiresAt) {
      // Attempt token refresh
      return await refreshSession(session);
    }

    return session;
  } catch (error) {
    console.error('Session unsealing error:', error);
    return null;
  }
}
```

### Token Refresh

```typescript
export async function refreshSession(session: WorkOSSession): Promise<WorkOSSession | null> {
  try {
    const { accessToken, refreshToken } = await workos.userManagement.refreshToken({
      refreshToken: session.refreshToken,
      clientId: process.env.WORKOS_CLIENT_ID!,
    });

    const newSession = {
      ...session,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    };

    await setSession(newSession);
    return newSession;
  } catch (error) {
    console.error('Token refresh failed:', error);
    await clearSession();
    return null;
  }
}
```

### Requiring Authentication

```typescript
export async function requireAuth(): Promise<WorkOSSession> {
  const session = await getSession();

  if (!session) {
    redirect('/sign-in');
  }

  return session;
}
```

---

## RBAC Integration

### Checking Permissions

```typescript
// lib/auth/workos-permissions.ts
import { requireAuth } from './workos-session';

export async function hasPermission(permission: string): Promise<boolean> {
  const session = await requireAuth();

  // Owner has all permissions
  if (session.role === 'owner') {
    return true;
  }

  // Check specific permissions based on role
  const rolePermissions: Record<string, string[]> = {
    admin: ['org:read', 'org:update', 'members:*', 'bookings:*', 'profiles:*'],
    member: ['org:read', 'bookings:read', 'bookings:create', 'profiles:read'],
    billing_admin: ['org:read', 'billing:*', 'subscriptions:*'],
  };

  const permissions = rolePermissions[session.role || ''] || [];

  // Check wildcard permissions
  if (permissions.includes('*')) return true;

  // Check specific permission
  if (permissions.includes(permission)) return true;

  // Check wildcard category
  const category = permission.split(':')[0];
  if (permissions.includes(`${category}:*`)) return true;

  return false;
}

export async function requirePermission(permission: string) {
  const allowed = await hasPermission(permission);

  if (!allowed) {
    throw new Error(`Permission denied: ${permission}`);
  }
}
```

### Using in Server Actions

```typescript
// server/actions/organizations.ts
'use server';

import { requirePermission } from '@/lib/auth/workos-permissions';
import { getOrgScopedDb } from '@/lib/integrations/neon/rls-client';

// server/actions/organizations.ts

export async function updateOrganization(orgId: string, data: { name: string }) {
  // Check permission
  await requirePermission('org:update');

  // Get org-scoped database (automatic RLS)
  const db = await getOrgScopedDb();

  // Update organization
  const [updated] = await db
    .update(OrganizationsTable)
    .set({ name: data.name, updatedAt: new Date() })
    .where(eq(OrganizationsTable.id, orgId))
    .returning();

  return updated;
}
```

---

## API Reference

### WorkOS Client

```typescript
// lib/integrations/workos/client.ts
import { WorkOS } from '@workos-inc/node';

export const workos = new WorkOS(process.env.WORKOS_API_KEY!, {
  clientId: process.env.WORKOS_CLIENT_ID!,
});

// Get authorization URL
export async function getAuthorizationUrl(options: {
  provider: string;
  redirectUri: string;
  state?: string;
}) {
  return workos.userManagement.getAuthorizationUrl({
    provider: options.provider,
    clientId: process.env.WORKOS_CLIENT_ID!,
    redirectUri: options.redirectUri,
    state: options.state,
  });
}
```

### Organization Management

```typescript
// Create organization
export async function createOrganization(name: string) {
  return await workos.organizations.createOrganization({
    name,
  });
}

// Get organization
export async function getOrganization(orgId: string) {
  return await workos.organizations.getOrganization(orgId);
}

// List user organizations
export async function listUserOrganizations(userId: string) {
  return await workos.userManagement.listOrganizationMemberships({
    userId,
  });
}
```

---

## Security Considerations

### JWT Validation

- JWTs are validated by Neon Auth using WorkOS JWKS URL
- Tokens expire after 1 hour (configurable)
- Refresh tokens used for session extension
- All tokens stored in HTTP-only cookies

### Session Security

```typescript
// Cookie settings
{
  httpOnly: true,          // No JavaScript access
  secure: true,            // HTTPS only in production
  sameSite: 'lax',         // CSRF protection
  maxAge: 604800,          // 7 days
  path: '/',               // Application-wide
}
```

### Rate Limiting

```typescript
// Implement rate limiting for auth endpoints
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});

// In auth routes
const { success } = await ratelimit.limit(req.ip);
if (!success) {
  return new Response('Too many requests', { status: 429 });
}
```

---

## Troubleshooting

### Common Issues

**Issue: "Invalid redirect URI"**

```bash
Solution: Verify WORKOS_REDIRECT_URI matches Dashboard configuration
Check: https://dashboard.workos.com → Redirect URIs
```

**Issue: "Session not persisting"**

```bash
Solution: Check cookie settings in browser
- Ensure cookies enabled
- Check secure flag matches protocol (HTTP vs HTTPS)
- Verify sameSite setting allows cross-origin if needed
```

**Issue: "Token expired" errors**

```bash
Solution: Implement token refresh
- Check refreshSession() implementation
- Verify refresh token not expired
- Handle refresh failures gracefully
```

**Issue: "JWKS validation failed"**

```bash
Solution: Verify Neon Auth configuration
- Check JWKS URL: https://api.workos.com/.well-known/jwks.json
- Test JWT manually: jwt.io
- Verify role_names in Neon configuration
```

### Debug Mode

```typescript
// Enable debug logging
export const workos = new WorkOS(process.env.WORKOS_API_KEY!, {
  clientId: process.env.WORKOS_CLIENT_ID!,
  debug: process.env.NODE_ENV === 'development',
});
```

---

## Migration Notes

When migrating from Clerk:

1. **User IDs change**: WorkOS uses different ID format
2. **Session structure differs**: Update session type definitions
3. **Middleware updates required**: Replace Clerk middleware
4. **Webhook endpoints change**: Update webhook handlers
5. **Audit logs**: Implement WorkOS audit logging

See [WorkOS Migration Runbook](../05-guides/workos-migration-runbook.md) for complete migration guide.

---

## Resources

- [WorkOS Documentation](https://workos.com/docs)
- [WorkOS AuthKit Guide](https://workos.com/docs/authkit)
- [WorkOS RBAC](https://workos.com/docs/rbac)
- [WorkOS Node SDK](https://github.com/workos/workos-node)
- [Neon Auth Integration](../03-infrastructure/neon-auth-rls.md)

---

**Questions?** Contact: technical-lead@eleva.care
