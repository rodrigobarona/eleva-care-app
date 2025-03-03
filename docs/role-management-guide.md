# Role Management Guide

## Overview

The application implements a robust role-based access control (RBAC) system using Clerk for authentication and custom role management. This guide explains how to implement and use role-based authorization throughout the application.

## Available Roles

The system supports the following roles:

```typescript
type UserRole = 'user' | 'community_expert' | 'top_expert' | 'admin' | 'superadmin';
```

## Implementation Methods

There are three main ways to implement role-based access control in the application:

### 1. Client-Side Role Checking (React Components)

#### Using the `useRoleCheck` Hook

```typescript
import { useRoleCheck } from '@/lib/hooks/useRoleCheck';

function MyComponent() {
  const { hasRole, hasAnyRole, isLoading } = useRoleCheck();

  if (isLoading) return null;

  // Check for a single role
  if (hasRole('admin')) {
    return <AdminContent />;
  }

  // Check for multiple roles
  if (hasAnyRole(['community_expert', 'top_expert'])) {
    return <ExpertContent />;
  }

  return <RegularUserContent />;
}
```

#### Using the `RequireRole` Component

```typescript
import { RequireRole } from '@/components/molecules/RequireRole';

// Basic usage
<RequireRole roles="admin">
  <AdminPanel />
</RequireRole>

// With multiple roles
<RequireRole roles={['community_expert', 'top_expert']}>
  <ExpertDashboard />
</RequireRole>

// With fallback content
<RequireRole
  roles="admin"
  fallback={<AccessDenied />}
>
  <AdminPanel />
</RequireRole>

// With redirect
<RequireRole
  roles="admin"
  redirectTo="/unauthorized"
>
  <AdminPanel />
</RequireRole>
```

### 2. Server-Side Role Checking

For server components, API routes, or server actions, use the `hasRole` helper:

```typescript
import { hasRole } from '@/lib/auth/roles.server';

// In a Server Component
export default async function AdminPage() {
  if (!(await hasRole('admin'))) {
    redirect('/unauthorized');
  }

  return <AdminContent />;
}

// In an API Route
export async function GET() {
  if (!(await hasRole('admin'))) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Process admin-only request
}
```

### 3. API Route Protection

Example of protecting an API route with role checks:

```typescript
async function isAdmin(userId: string) {
  return (await hasRole('admin')) || (await hasRole('superadmin'));
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!(await isAdmin(userId))) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Process admin-only request
  } catch (error) {
    console.error('Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
```

## Best Practices

1. **Layer Security**: Implement role checks at multiple levels:

   - UI level (hide unauthorized content)
   - Client-side routing (prevent unauthorized navigation)
   - API routes (prevent unauthorized access to data)
   - Server actions (prevent unauthorized operations)

2. **Error Handling**:

   - Always provide meaningful feedback to users when access is denied
   - Log unauthorized access attempts for security monitoring
   - Use appropriate HTTP status codes (401 for unauthenticated, 403 for unauthorized)

3. **Performance**:

   - Use `isLoading` checks to prevent flickering during role verification
   - Cache role check results when appropriate
   - Implement role checks at the highest possible level in the component tree

4. **Type Safety**:
   - Use TypeScript to ensure role names are consistent
   - Define role constants to prevent typos
   - Use union types for role definitions

## Common Use Cases

### Protecting Routes

```typescript
// In a page component
export default async function ProtectedPage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    redirect('/unauthorized');
  }

  const hasAccess = await hasRole(['community_expert', 'top_expert']);
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return <ProtectedContent />;
}
```

### Conditional UI Rendering

```typescript
function Dashboard() {
  return (
    <>
      {/* Basic features available to all */}
      <BasicFeatures />

      {/* Expert-only features */}
      <RequireRole roles={['community_expert', 'top_expert']}>
        <ExpertFeatures />
      </RequireRole>

      {/* Admin-only features */}
      <RequireRole roles="admin">
        <AdminFeatures />
      </RequireRole>
    </>
  );
}
```

### API Protection

```typescript
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const hasAccess = await hasRole(['admin', 'superadmin']);
    if (!hasAccess) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Process protected request
  } catch (error) {
    console.error('Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
```

## Troubleshooting

Common issues and their solutions:

1. **Role Not Updating**:

   - Ensure Clerk metadata is properly synchronized
   - Check if the user session is current
   - Verify role assignment in Clerk dashboard

2. **Flickering Content**:

   - Use `isLoading` check from `useRoleCheck`
   - Implement loading states
   - Consider server-side rendering when possible

3. **Type Errors**:
   - Ensure role names match the `UserRole` type
   - Use type assertions carefully
   - Keep role definitions synchronized

## Security Considerations

1. **Multiple Layers**: Always implement role checks at both client and server levels

2. **Error Messages**: Avoid revealing sensitive information in error messages

3. **Logging**: Implement proper logging for security events

4. **Updates**: Keep authentication and authorization libraries updated

5. **Testing**: Regularly test role-based access control functionality

## Future Enhancements

Consider these potential improvements:

1. Implement role hierarchies
2. Add permission-based access control
3. Create role management UI for administrators
4. Add audit logging for role changes
5. Implement role-based rate limiting

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
- [React Security Best Practices](https://reactjs.org/docs/security.html)
