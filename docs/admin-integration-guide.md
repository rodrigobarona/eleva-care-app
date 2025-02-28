# Admin Integration and Management

## Overview

The Admin section provides a centralized interface for managing users, roles, and system settings in the Eleva Care application. This document outlines the architecture, components, and functionality of the admin system, as well as best practices for extending it.

## Access Control

Access to the Admin dashboard is restricted to users with either the `admin` or `superadmin` role. The system implements multi-layered protection:

1. **Client-side authorization**: The Admin dashboard component checks user roles and redirects unauthorized users.
2. **Server-side API protection**: All admin API endpoints verify that the requesting user has the required roles.
3. **Role-based component rendering**: UI elements are conditionally rendered based on user roles.

### Role Hierarchy in Admin Context

- **Superadmin**: Has complete access to all admin features, including assigning/removing the superadmin role.
- **Admin**: Has access to most admin features but cannot manage superadmin roles.

## Admin Dashboard Structure

The Admin dashboard is organized into several key sections:

### 1. User Management

The User Management section allows administrators to:

- View all system users with their basic information
- Manage user roles (add/remove roles)
- See when users were created

The component hierarchy for user management is:

- `UserManagement`: Main component that fetches and displays users
- `UserRoleManager`: Component for adding/removing roles for a specific user

### 2. System Settings

The settings section will provide controls for global application settings (coming soon).

### 3. Analytics

The analytics section will provide insights into system usage and performance (coming soon).

## Key Components

### AdminNavItem

The `AdminNavItem` component is displayed in the navigation bar for users with admin privileges. It provides quick access to the admin dashboard and related features through a dropdown menu.

Key features:

- Conditionally renders based on user roles
- Provides quick navigation to admin features
- Displays a dropdown with admin options

### UserManagement

The `UserManagement` component displays a table of all users in the system and allows administrators to manage their roles.

Key features:

- Fetches users from the admin API
- Displays user information in a table format
- Allows selecting a user to manage their roles
- Integrates with the `UserRoleManager` component

### UserRoleManager

The `UserRoleManager` component provides an interface for adding and removing roles from a user.

Key features:

- Displays current user roles as badges
- Provides a dropdown to add new roles
- Validates role assignments (prevents removing the last role)
- Shows different badge colors for different role types

## API Endpoints

The admin system exposes several REST API endpoints:

### `/api/admin/users` (GET)

Fetches all users in the system along with their roles and basic information.

**Access**: Requires `admin` or `superadmin` role
**Response**: Array of user objects with Clerk and database information

### `/api/users/[userId]/roles` (GET, POST, DELETE)

Manages roles for a specific user.

**GET**: Retrieves roles for a specific user

- Access: User's own roles or requires `admin`/`superadmin` role

**POST**: Adds a role to a user

- Access: Requires `admin` or `superadmin` role
- Restrictions: Only `superadmin` can assign the `superadmin` role

**DELETE**: Removes a role from a user

- Access: Requires `admin` or `superadmin` role
- Restrictions:
  - Only `superadmin` can remove the `superadmin` role
  - Cannot remove a user's last role

## Frontend Role Utilities

The system provides several utility functions in `lib/auth/roles.ts`:

- `hasRole(userRoles, requiredRoles)`: Checks if a user has any of the required roles
- `isAdmin(userRoles)`: Checks if a user is an admin
- `isSuperAdmin(userRoles)`: Checks if a user is a superadmin
- `isExpert(userRoles)`: Checks if a user is an expert
- `getRoleDisplayName(role)`: Gets a formatted display name for a role
- `fetchUserRoles()`: Fetches the current user's roles from the API

## Server-Side Authorization

Server-side authorization is managed through utilities in `lib/auth/server-auth.ts`:

- `checkHasRole(requiredRoles)`: Checks if the current user has any of the specified roles
- `checkIsSuperAdmin()`: Verifies that a user has the superadmin role
- `getCurrentUserRoles()`: Fetches all roles for the current user

## Implementation Example: Adding Admin-Only Features

To add a new admin-only feature:

1. Create your feature component
2. Implement role checks using the `hasRole` function or similar utilities
3. Add server-side protection to any new API endpoints
4. Update the Admin dashboard to include your feature

Example:

```typescript
// Client-side role check
const [userRoles, setUserRoles] = useState<string[]>([]);

useEffect(() => {
  async function fetchRoles() {
    const roles = await fetchUserRoles();
    setUserRoles(roles);
  }
  fetchRoles();
}, []);

// Conditionally render based on roles
if (isAdmin(userRoles)) {
  return <AdminFeature />;
} else {
  return null;
}
```

```typescript
// Server-side endpoint protection
export async function GET() {
  try {
    // Verify the user has admin or superadmin role
    const authorized = await checkHasRole(['superadmin', 'admin']);

    if (!authorized) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Admin-only logic here...
  } catch (error) {
    // Error handling...
  }
}
```

## Best Practices

1. **Always implement both client and server-side authorization**

   - Client-side for UI experience
   - Server-side for security

2. **Use the provided role utilities**

   - Don't implement custom role checking logic

3. **Consider permission granularity**

   - Roles define broad access levels
   - For more specific controls, use the permission system

4. **Respect role hierarchy**

   - Ensure superadmin-specific features are properly protected

5. **Handle unauthorized access gracefully**
   - Redirect to appropriate pages
   - Provide clear error messages

## Troubleshooting

**Problem**: Admin features not showing for an admin user
**Solution**: Verify user roles in the database, check client-side role fetching

**Problem**: "Forbidden" errors when accessing admin APIs
**Solution**: Check that the user has the required roles and that role checking is correctly implemented

**Problem**: Inconsistent permissions behavior
**Solution**: Clear browser cache, verify roles in database, check for race conditions in role fetching

## Future Enhancements

Planned enhancements for the admin system include:

1. Audit logging for admin actions
2. Enhanced user filtering and search
3. Bulk user operations
4. System settings management
5. Dashboard with key metrics
