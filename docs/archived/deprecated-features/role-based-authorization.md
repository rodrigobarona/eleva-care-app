# Role-Based Authorization System

## Overview

The Role-Based Authorization System provides a flexible and secure way to manage user permissions across the Eleva Care application. The system uses Clerk's user metadata to store roles and implements a centralized approach to role checking across the application.

## Centralized Role Constants

All role names, route paths, and groupings are defined in a single location at `/lib/constants/roles.ts`. This provides a single source of truth for all role-related constants across the application:

```typescript
// lib/constants/roles.ts

// Individual Role Names
export const ROLE_USER = 'user' as const;
export const ROLE_TOP_EXPERT = 'top_expert' as const;
export const ROLE_COMMUNITY_EXPERT = 'community_expert' as const;
export const ROLE_LECTURER = 'lecturer' as const;
export const ROLE_ADMIN = 'admin' as const;
export const ROLE_SUPERADMIN = 'superadmin' as const;

// Complete list of roles
export const ALL_ROLES = [
  ROLE_USER,
  ROLE_TOP_EXPERT,
  ROLE_COMMUNITY_EXPERT,
  ROLE_LECTURER,
  ROLE_ADMIN,
  ROLE_SUPERADMIN,
] as const;

// Role groupings for common use cases
export const ADMIN_ROLES = [ROLE_ADMIN, ROLE_SUPERADMIN] as const;
export const EXPERT_ROLES = [
  ROLE_TOP_EXPERT,
  ROLE_COMMUNITY_EXPERT,
  ROLE_ADMIN,
  ROLE_SUPERADMIN,
] as const;

// Route definitions for role-based access control
export const PUBLIC_ROUTES = [
  '/',
  '/sign-in(.*)',
  // ... other public routes
] as const;

export const ADMIN_ROUTES = [
  '/admin(.*)',
  '/api/admin(.*)',
  // ... other admin routes
] as const;

// ... other route groupings
```

These constants are then re-exported from `/lib/auth/roles.ts` to maintain backward compatibility.

## Role Hierarchy

The system defines the following primary user roles, in descending order of privilege:

1. **Superadmin**: Complete system access and control
2. **Admin**: Administrative access with limitations
3. **Top Expert**: Enhanced capabilities for featured experts
4. **Community Expert**: Standard expert functionality
5. **Lecturer**: Educational content providers
6. **User (Customer)**: Basic user access

Each user must have at least one role, with `user` being the default role assigned during registration.

## Centralized Implementation

The role system is implemented using a centralized approach with three main components:

### 1. Server-Side Role Management (`/lib/auth/roles.server.ts`)

This module provides server-side role checking functionality:

```typescript
import {
  ADMIN_ROLES,
  ROLE_ADMIN,
  ROLE_COMMUNITY_EXPERT,
  ROLE_TOP_EXPERT,
} from '@/lib/constants/roles';

// Core role checking functions
async function hasRole(role: UserRole): Promise<boolean>;
async function hasAnyRole(roles: UserRole[]): Promise<boolean>;

// Middleware helper for role checking
export function checkRoles(
  userRoles: string | string[] | unknown,
  requiredRoles: readonly string[],
): boolean;

// Specialized helper functions
async function isAdmin(): Promise<boolean> {
  return hasAnyRole([...ADMIN_ROLES] as UserRole[]);
}
async function isExpert(): Promise<boolean>;
async function isTopExpert(): Promise<boolean>;
async function isCommunityExpert(): Promise<boolean>;

// Role management
async function getUserRole(): Promise<UserRoles>;
async function updateUserRole(userId: string, roles: UserRoles): Promise<void>;
```

### 2. Client-Side Role Management (`/components/molecules/AuthorizationProvider.tsx`)

Provides React context and hooks for client-side role checking:

```typescript
import { ROLE_ADMIN /* etc */ } from '@/lib/constants/roles';

// Core context provider and hook
AuthorizationProvider // Context provider component
useAuthorization() // Access to roles, hasRole function, and loading state

// Specialized helper hooks
useIsAdmin(): boolean
useIsExpert(): boolean
useIsTopExpert(): boolean
useIsCommunityExpert(): boolean

// UI component for role-based rendering
RequireRole // Conditional rendering component
```

### 3. Route Protection (`/middleware.ts`)

Middleware-based protection for entire routes:

```typescript
import { checkRoles } from '@/lib/auth/roles.server';
import {
  ADMIN_ROLES,
  ADMIN_ROUTES,
  EXPERT_ROLES,
  EXPERT_ROUTES,
  PUBLIC_ROUTES,
  SPECIAL_AUTH_ROUTES,
} from '@/lib/constants/roles';

// In the middleware function:
if (matchesPattern(path, ADMIN_ROUTES)) {
  const isAdmin = checkRoles(userRoleData, ADMIN_ROLES);
  if (!isAdmin) {
    // Handle unauthorized access
  }
}
```

## Storage Implementation

Roles are stored in Clerk's user metadata under the `role` key, which can be:

- A single string value (e.g., `"admin"`)
- An array of strings (e.g., `["admin", "top_expert"]`)

The system handles both formats consistently throughout the application.

## Authorization Flow

1. **User Registration/Login**:

   - Roles are assigned and stored in Clerk user metadata
   - Can be stored as either a string or an array of strings

2. **Server Component Authorization**:

   - Server components use `hasRole`, `isAdmin`, or other helper functions
   - Unauthorized users are redirected to appropriate pages

3. **Client Component Authorization**:

   - Client components use specialized hooks or the `RequireRole` component
   - UI elements are conditionally rendered based on user roles

4. **API Route Authorization**:

   - API routes check roles with server helpers
   - Return appropriate status codes (401/403) for unauthorized access

5. **Route Protection**:
   - Middleware checks roles before routes are accessed
   - Redirects unauthorized users to configured destinations

## Usage Examples

### Server Component Example

```tsx
// app/(private)/(settings)/admin/layout.tsx
import { isAdmin } from '@/lib/auth/roles.server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) {
    redirect('/');
  }

  return (
    // Admin layout content
  );
}
```

### Client Component Example

```tsx
// components/ExampleProtectedComponent.tsx
'use client';

import { useIsAdmin, useIsExpert } from '@/components/molecules/AuthorizationProvider';

// components/ExampleProtectedComponent.tsx

// components/ExampleProtectedComponent.tsx

// components/ExampleProtectedComponent.tsx

// components/ExampleProtectedComponent.tsx

// components/ExampleProtectedComponent.tsx

// components/ExampleProtectedComponent.tsx

// components/ExampleProtectedComponent.tsx

// components/ExampleProtectedComponent.tsx

// components/ExampleProtectedComponent.tsx

export function ExampleProtectedComponent() {
  const isAdmin = useIsAdmin();
  const isExpert = useIsExpert();

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isExpert) {
    return <ExpertDashboard />;
  }

  return <RegularUserContent />;
}
```

### Conditional UI Rendering

```tsx
// Conditional rendering in components
import { RequireRole } from '@/components/molecules/AuthorizationProvider';
import { ROLE_ADMIN, ROLE_COMMUNITY_EXPERT, ROLE_TOP_EXPERT } from '@/lib/constants/roles';

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Admin-only section */}
      <RequireRole roles={ROLE_ADMIN}>
        <AdminControls />
      </RequireRole>

      {/* Expert-only section */}
      <RequireRole roles={[ROLE_COMMUNITY_EXPERT, ROLE_TOP_EXPERT]}>
        <ExpertTools />
      </RequireRole>
    </div>
  );
}
```

### API Route Protection

```typescript
// app/api/admin/settings/route.ts
import { isAdmin } from '@/lib/auth/roles.server';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Handle admin-only request
}
```

## Benefits of Centralized Approach

1. **Consistency**: Same role names and logic applied everywhere
2. **Maintainability**: Role definitions and route patterns in one place
3. **Type Safety**: TypeScript types for role checking with compile-time verification
4. **Single Source of Truth**: Prevents mismatches between role definitions
5. **Simplicity**: Clear helper functions for common role checks
6. **Reliability**: Prevents typos in string literals representing roles

## Security Considerations

1. **Multiple Layers**: Authorization implemented at UI, API, and middleware levels
2. **Principle of Least Privilege**: Grant only the minimum roles needed
3. **Clear Feedback**: Provide clear messaging for unauthorized access
4. **Loading States**: Handle loading states to prevent flashes of unauthorized content

## Future Enhancements

1. **Permission System**: Add granular permissions within roles
2. **Role Inheritance**: Implement hierarchical role inheritance
3. **Audit Logging**: Track role changes for security monitoring
4. **Time-Limited Roles**: Support for temporary role assignments
5. **Dynamic Role UI**: Admin interface for managing roles

## Layered Authorization Approach

Our application implements role-based access control (RBAC) at multiple levels for defense in depth:

### Level 1: Middleware Protection

The first layer of defense is implemented in `middleware.ts`, which provides broad route protection:

```typescript
// Middleware uses centralized route and role definitions
import { checkRoles } from '@/lib/auth/roles.server';
import { ADMIN_ROLES, ADMIN_ROUTES, EXPERT_ROLES, EXPERT_ROUTES } from '@/lib/constants/roles';

// In middleware:
if (matchesPattern(path, ADMIN_ROUTES)) {
  const isAdmin = checkRoles(userRoleData, ADMIN_ROLES);
  if (!isAdmin) {
    // Handle unauthorized access
  }
}
```

This middleware:

- Allows public routes without authentication (homepage, sign-in, public profiles)
- Protects API routes with appropriate status codes (401/403)
- Restricts route groups based on user roles:
  - `/admin/*` → Admin & Superadmin only
  - `/api/admin/*` → Admin & Superadmin only
  - `/booking/*` → Experts, Admins & Superadmins only
  - `/appointments/*` → Experts, Admins & Superadmins only
  - Expert-specific API routes → Experts, Admins & Superadmins only
- Special handling for routes like cron jobs (API key validation)

Benefits of middleware protection:

- Early rejection of unauthorized requests
- Consistent handling across similar route patterns
- Clear overview of protected sections in one place
- Proper HTTP status codes for API routes

### Level 2: Layout Protection

The second layer is at the layout level:

- `app/(private)/(settings)/admin/layout.tsx` → verifies admin role
- `app/(private)/appointments/layout.tsx` → verifies expert role
- `app/(private)/booking/layout.tsx` → verifies expert role

Example layout protection:

```tsx
// app/(private)/appointments/layout.tsx
export default async function AppointmentsLayout({ children }) {
  const userIsExpert = await isExpert();

  if (!userIsExpert) {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
```

Benefits of layout protection:

- Granular control at the route group level
- Can access database and server context for complex checks
- Catches any bypassed middleware protections

### Level 3: Page-Specific Protection

The third layer is at the page level, where specific pages may implement additional restrictions:

- Resource ownership checks
- Feature-specific permissions
- Sub-role requirements (like Top Expert vs. Community Expert)

Example page protection:

```tsx
// Example page with additional checks
export default async function ManageAppointmentPage({ params }) {
  // Check the expert role first
  const userIsExpert = await isExpert();
  if (!userIsExpert) redirect('/unauthorized');

  // Then check resource ownership
  const { appointmentId } = params;
  const appointment = await db.appointments.findUnique({ where: { id: appointmentId } });

  if (appointment.expertId !== userId) {
    // Even though they're an expert, they don't own this resource
    redirect('/unauthorized');
  }

  return <ManageAppointmentUI appointment={appointment} />;
}
```

### Level 4: Component-Level Controls

The final layer is UI component visibility with client-side hooks:

- `useIsAdmin()` - check for admin role
- `useIsExpert()` - check for any expert role
- `useIsTopExpert()` - check specifically for top expert
- `RequireRole` - conditional rendering component

Example component protection:

```tsx
// Client component with conditional rendering
function AppointmentActions({ appointment }) {
  const isAdmin = useIsAdmin();
  const isTopExpert = useIsTopExpert();

  return (
    <div className="actions">
      {/* Everyone can see this */}
      <ViewButton appointment={appointment} />

      {/* Only admins and top experts can refund */}
      {(isAdmin || isTopExpert) && <RefundButton appointment={appointment} />}

      {/* Only admins can delete */}
      {isAdmin && <DeleteButton appointment={appointment} />}
    </div>
  );
}
```

## API Route Protection

API routes follow the same multi-layered protection strategy:

1. **Middleware layer**: Broad route pattern protection (e.g., `/api/admin/*`)
2. **Route handler level**: Specific endpoint protection using server-side role helpers

Example API route protection:

```tsx
// app/api/admin/users/route.ts
export async function GET() {
  // Already protected by middleware, but we double-check
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Process admin-only request
  const users = await db.users.findMany();
  return NextResponse.json({ users });
}
```

## Special Authentication Cases

Some routes require special authentication methods:

1. **Cron Jobs**: Protected with API keys

   ```typescript
   // Example cron job request
   fetch('/api/cron/process-payments', {
     headers: {
       'x-api-key': process.env.CRON_API_KEY,
     },
   });
   ```

2. **Webhooks**: Public routes but validated internally
   ```typescript
   // Example Stripe webhook validation
   const sig = req.headers.get('stripe-signature');
   const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
   ```

## Summary

This multi-layered approach ensures:

1. **Defense in depth**: Multiple checks at different levels
2. **Performance**: Early rejection when possible
3. **Granularity**: Fine-grained control where needed
4. **Maintenance**: Clear organization of authorization logic
5. **Security**: No single point of failure
