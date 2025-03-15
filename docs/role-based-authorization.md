# Role-Based Authorization System

## Overview

The Role-Based Authorization System provides a flexible and secure way to manage user permissions across the Eleva Care application. The system uses Clerk's user metadata to store roles and implements a centralized approach to role checking across the application.

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
// Core role checking functions
async function hasRole(role: UserRole): Promise<boolean>;
async function hasAnyRole(roles: UserRole[]): Promise<boolean>;

// Specialized helper functions
async function isAdmin(): Promise<boolean>;
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
// Configuration for protected routes
const protectedRoutes = [
  {
    path: '/admin',
    roles: ['admin', 'superadmin'],
    redirectUrl: '/',
  },
  {
    path: '/expert',
    roles: ['top_expert', 'community_expert'],
    redirectUrl: '/',
  },
  // Additional protected routes...
];
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

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Admin-only section */}
      <RequireRole roles="admin">
        <AdminControls />
      </RequireRole>

      {/* Expert-only section */}
      <RequireRole roles={['community_expert', 'top_expert']}>
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

1. **Consistency**: Same role logic applied everywhere
2. **Maintainability**: Role logic updates in one place
3. **Type Safety**: TypeScript types for role checking
4. **Flexibility**: Handles both array and string role formats
5. **Simplicity**: Clear helper functions for common role checks

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
