# Role-Based Authorization System

## Overview

The Role-Based Authorization System provides a flexible and secure way to manage user permissions across the Eleva Care application. The system consists of a hierarchical role structure, granular permissions, and utility components for implementing role-based UI rendering and route protection.

## Role Hierarchy

The system defines five primary user roles, in descending order of privilege:

1. **Superadmin**: Complete system access and control
2. **Admin**: Administrative access with limitations
3. **Top Expert**: Enhanced capabilities for featured experts
4. **Community Expert**: Standard expert functionality
5. **User (Customer)**: Basic user access

Each user must have at least one role, with `user` being the default role assigned during registration.

## Database Schema

The role system is implemented using three main tables:

### `user_roles` Table

Stores the many-to-many relationship between users and roles:

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT NOT NULL,
  role user_role NOT NULL,
  assigned_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(clerk_user_id, role)
);
```

### `permissions` Table

Stores individual permissions that can be assigned to roles:

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### `role_permissions` Table

Maps the many-to-many relationship between roles and permissions:

```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, permission_id)
);
```

The `users` table was also updated to include a `primary_role` field that indicates the user's main role.

## Backend Authorization

### Utility Functions

The core functionality is implemented in `lib/auth/roles.ts`, which provides these key functions:

#### Role Check Functions

- `hasRole(db, userId, role)`: Checks if a user has a specific role
- `hasPermission(db, userId, permission)`: Checks if a user has a specific permission
- `getUserRoles(db, userId)`: Gets all roles for a user
- `getUserPermissions(db, userId)`: Gets all permissions for a user

#### Role Management Functions

- `assignRole(db, userId, role, assignedBy)`: Assigns a role to a user
- `removeRole(db, userId, role)`: Removes a role from a user

### API Endpoints

Several API routes manage the role system:

- `GET /api/auth/user-authorization`: Returns roles and permissions for the current user
- `GET /api/users/[userId]/roles`: Gets roles for a specific user
- `POST /api/users/[userId]/roles`: Assigns a role to a user
- `DELETE /api/users/[userId]/roles`: Removes a role from a user

### Middleware

Two middleware functions protect routes based on roles or permissions:

- `withRoleAuthorization(roles)`: Restricts access to users with specified roles
- `withPermissionAuthorization(permissions)`: Restricts access to users with specified permissions

Example usage:

```typescript
// Protect a route with role-based authorization
export default withRoleAuthorization(['admin', 'superadmin'])(AdminPage);

// Protect a route with permission-based authorization
export default withPermissionAuthorization(['manage_users'])(UserManagementPage);
```

## Frontend Authorization

### Authorization Provider

The `AuthorizationProvider` component in `components/molecules/AuthorizationProvider.tsx` creates a React context that fetches and maintains the current user's roles and permissions:

```typescript
// Example usage in a component
const { hasRole, hasPermission } = useAuthorization();

if (hasRole('admin')) {
  // Show admin content
}

if (hasPermission('edit_users')) {
  // Show user edit button
}
```

### Role-Based UI Components

Two components help implement role-based UI rendering:

#### `RequireRole` Component

Conditionally renders content based on user roles:

```tsx
<RequireRole role="admin">
  <AdminPanel />
</RequireRole>

// Or with multiple roles
<RequireRole role={['admin', 'superadmin']}>
  <AdminPanel />
</RequireRole>

// With a fallback for unauthorized users
<RequireRole role="admin" fallback={<UnauthorizedMessage />}>
  <AdminPanel />
</RequireRole>
```

#### `RequirePermission` Component

Conditionally renders content based on user permissions:

```tsx
<RequirePermission permission="manage_events">
  <EventManagementPanel />
</RequirePermission>

// With multiple permissions (any one required)
<RequirePermission permission={['edit_events', 'view_events']}>
  <EventViewPanel />
</RequirePermission>
```

### Admin User Interface

The `UserRoleManager` component in `components/admin/UserRoleManager.tsx` provides a UI for administrators to manage user roles:

- View a user's current roles
- Add new roles to a user
- Remove roles from a user (preventing removal of the last role)
- Visual role badges with color-coding by role level

## Authorization Flow

1. **User Registration**:

   - New users are automatically assigned the `user` role
   - Primary role is set to `user`

2. **Login & Session**:

   - Upon login, user roles and permissions are fetched
   - `AuthorizationProvider` caches this data for the session

3. **Role Check Process**:

   - When a component needs to verify authorization:
     - UI components use React context hooks
     - Middleware checks directly against the database
     - API routes verify permissions before executing actions

4. **Role Updates**:

   - When a role is added or removed:
     - Database is updated
     - User's primary role may be adjusted
     - Client must refresh to see updated permissions

5. **Unauthorized Access**:
   - Users without required roles are redirected to `/unauthorized`
   - UI components with role requirements are conditionally rendered

## Usage Examples

### Protecting an Admin Route

```typescript
// app/(private)/admin/page.tsx
export default withRoleAuthorization(['admin', 'superadmin'])(AdminPage);

function AdminPage() {
  return <div>Admin Dashboard</div>;
}
```

### Conditional UI Rendering

```tsx
// components/Dashboard.tsx
import { RequireRole, useAuthorization } from '@/components/molecules/AuthorizationProvider';

export function Dashboard() {
  const { hasRole } = useAuthorization();

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Using the hook directly */}
      {hasRole('admin') && <AdminStats />}

      {/* Using the component */}
      <RequireRole role="community_expert">
        <ExpertTools />
      </RequireRole>
    </div>
  );
}
```

### Managing User Roles

```tsx
// app/(private)/admin/users/[id]/page.tsx
import { UserRoleManager } from '@/components/admin/UserRoleManager';

export default function UserManagementPage({ params }) {
  const { id } = params;
  const [userRoles, setUserRoles] = useState([]);

  // Fetch user roles...

  return (
    <div>
      <h1>Manage User</h1>
      <UserRoleManager userId={id} currentRoles={userRoles} userName="John Doe" />
    </div>
  );
}
```

## Security Considerations

1. **Role Validation**: All role assignments and checks validate against the defined enum of roles.
2. **Authorization Layers**: Security is implemented at multiple levels (UI, API, middleware).
3. **Superadmin Protection**: Only superadmins can assign or remove the superadmin role.
4. **Minimum Role Enforcement**: Users must always have at least one role.
5. **Type Safety**: TypeScript enforces correct role types throughout the application.

## Future Enhancements

Potential improvements to the role system:

1. **Role Inheritance**: Implement a hierarchy where higher roles inherit permissions from lower roles.
2. **Time-Limited Roles**: Roles that automatically expire after a certain period.
3. **Role Request System**: Allow users to request role upgrades with admin approval.
4. **Role Audit Log**: Track all role changes with timestamps and the user who made the change.
5. **Dynamic Permission UI**: Admin interface for creating and assigning permissions without code changes.
