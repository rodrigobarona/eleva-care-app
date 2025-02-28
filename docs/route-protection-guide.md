# Route Protection Guide

This guide explains how to use the role-based authorization system to protect routes in the Eleva Care application.

## Overview

Route protection ensures that only users with appropriate roles or permissions can access certain pages or API endpoints. The application provides two main approaches to route protection:

1. **Middleware-based protection** for server-side routes
2. **Component-based protection** for client-side UI elements

## Middleware-Based Route Protection

Middleware functions provide the most secure method for protecting routes as they run on the server before the page is even rendered. This prevents unauthorized users from seeing protected content entirely.

### Protecting Routes with Roles

To protect a route requiring specific roles, use the `withRoleAuthorization` middleware:

```typescript
// app/(private)/admin/settings/page.tsx
import { withRoleAuthorization } from '@/middleware/withAuthorization';

function AdminSettingsPage() {
  return (
    <div>
      <h1>Admin Settings</h1>
      {/* Admin settings content */}
    </div>
  );
}

// Protect this page, requiring either admin or superadmin role
export default withRoleAuthorization(['admin', 'superadmin'])(AdminSettingsPage);
```

### Protecting Routes with Permissions

For more granular control, you can protect routes based on specific permissions:

```typescript
// app/(private)/admin/users/page.tsx
import { withPermissionAuthorization } from '@/middleware/withAuthorization';

function UserManagementPage() {
  return (
    <div>
      <h1>User Management</h1>
      {/* User management content */}
    </div>
  );
}

// Protect this page, requiring the 'manage_users' permission
export default withPermissionAuthorization(['manage_users'])(UserManagementPage);
```

### Protecting API Routes

For API routes, you typically handle authorization within the route handler:

```typescript
// app/api/admin/settings/route.ts
import { db } from '@/drizzle/db';
import { hasRole } from '@/lib/auth/roles';
import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has admin role
  const isAdmin = await hasRole(db, userId, 'admin');

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Return protected data
  return NextResponse.json({
    settings: {
      /* admin settings */
    },
  });
}
```

## Component-Based Protection

For protecting UI elements within a page, use the authorization components and hooks.

### Using the `RequireRole` Component

The `RequireRole` component conditionally renders its children based on the user's roles:

```tsx
import { RequireRole } from '@/components/molecules/AuthorizationProvider';

function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Only visible to admins */}
      <RequireRole role="admin">
        <AdminPanel />
      </RequireRole>

      {/* Only visible to experts */}
      <RequireRole role={['top_expert', 'community_expert']}>
        <ExpertTools />
      </RequireRole>

      {/* With a fallback for unauthorized users */}
      <RequireRole
        role="superadmin"
        fallback={<p>You need superadmin privileges to view this section.</p>}
      >
        <SuperAdminControls />
      </RequireRole>
    </div>
  );
}
```

### Using the `useAuthorization` Hook

For more programmatic control, use the `useAuthorization` hook:

```tsx
import { useAuthorization } from '@/components/molecules/AuthorizationProvider';

function ComplexComponent() {
  const { hasRole, hasPermission, userRoles, isLoading } = useAuthorization();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Account Management</h2>

      {hasRole('admin') && <button onClick={handleAdminAction}>Admin Action</button>}

      {hasPermission('delete_users') && <button onClick={handleDeleteUser}>Delete User</button>}

      <div>Your roles: {userRoles.join(', ')}</div>
    </div>
  );
}
```

## Mixed Protection Strategy

For the most secure implementation, combine both approaches:

1. Use middleware to protect the entire route
2. Use components for fine-grained UI control within protected pages

```typescript
// app/(private)/admin/dashboard/page.tsx
import { withRoleAuthorization } from '@/middleware/withAuthorization';
import { RequirePermission } from '@/components/molecules/AuthorizationProvider';

function AdminDashboardPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>

      {/* These sections have additional permission requirements */}
      <RequirePermission permission="view_revenue">
        <RevenueSection />
      </RequirePermission>

      <RequirePermission permission="manage_experts">
        <ExpertManagementSection />
      </RequirePermission>
    </div>
  );
}

// First protect the entire page
export default withRoleAuthorization(['admin', 'superadmin'])(AdminDashboardPage);
```

## Handling Unauthorized Access

When a user attempts to access a protected route without proper authorization:

1. **Middleware protection**: The user is redirected to the `/unauthorized` page
2. **Component protection**: The component is not rendered (or the fallback is shown)

The `/unauthorized` page provides a user-friendly error message and navigation options.

## Best Practices

1. **Defense in Depth**: Always implement authorization at multiple levels
2. **Principle of Least Privilege**: Grant only the minimum roles/permissions needed
3. **Clear Feedback**: Always show users why they don't have access
4. **Loading States**: Handle loading states to prevent flashes of unauthorized content
5. **Testing**: Verify authorization works by testing with different user roles

## Common Issues

### Flashing Content

If protected content briefly appears before disappearing, make sure to handle loading states:

```tsx
const { hasRole, isLoading } = useAuthorization();

if (isLoading) {
  return <LoadingSpinner />;
}

return hasRole('admin') ? <AdminContent /> : null;
```

### Session Issues

If role checks aren't working correctly after role changes, ensure the user's session is refreshed:

```tsx
// After role changes
const handleRoleChange = async () => {
  await fetch('/api/auth/user-authorization');
  window.location.reload(); // Force a full page refresh
};
```
