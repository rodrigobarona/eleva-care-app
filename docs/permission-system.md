# Permission System

This document explains how permissions work in the Eleva Care application's role-based authorization system.

## Overview

While roles define broad access levels, permissions provide granular control over specific actions within the application. Permissions are assigned to roles, and users inherit the permissions of all their assigned roles.

## Permission Structure

Permissions in Eleva Care follow a resource-action pattern:

```
[resource]:[action]
```

Examples:

- `events:create` - Allows creating events
- `users:view` - Allows viewing user details
- `users:manage` - Allows full management of users
- `billing:access` - Allows access to billing information

## Default Permission Sets

Each role has a predefined set of permissions:

### Superadmin

- All permissions (system-wide access)

### Admin

- `users:view`, `users:edit`
- `experts:manage`
- `events:manage`
- `billing:view`
- `reports:access`

### Top Expert

- `appointments:manage`
- `customers:view`
- `events:create`, `events:edit`
- `profile:customize`
- `billing:access`

### Community Expert

- `appointments:manage`
- `customers:view`
- `events:create`
- `profile:basic`
- `billing:access`

### User (Customer)

- `appointments:book`
- `profile:edit`

## Database Implementation

Permissions are stored in the database in two main tables:

1. `permissions` - Stores all available permissions
2. `role_permissions` - Maps permissions to roles

### Creating New Permissions

To add new permissions to the system, insert them into the `permissions` table:

```sql
INSERT INTO permissions (name, description)
VALUES
('events:create', 'Create new events'),
('events:edit', 'Edit existing events'),
('events:delete', 'Delete events');
```

### Assigning Permissions to Roles

To assign permissions to roles, insert mappings into the `role_permissions` table:

```sql
-- Get permission IDs
WITH perm_ids AS (
  SELECT id, name FROM permissions
  WHERE name IN ('events:create', 'events:edit')
)
-- Insert mappings for the community_expert role
INSERT INTO role_permissions (role, permission_id)
SELECT 'community_expert', id FROM perm_ids;
```

## Checking Permissions

### Backend Permission Checks

In server-side code, use the `hasPermission` function:

```typescript
import { db } from '@/drizzle/db';
import { hasPermission } from '@/lib/auth/roles';

// In an API route or server action
async function protectedOperation(userId: string) {
  const canCreateEvent = await hasPermission(db, userId, 'events:create');

  if (!canCreateEvent) {
    throw new Error('Permission denied');
  }

  // Proceed with operation...
}
```

### Frontend Permission Checks

In client components, use the `useAuthorization` hook or `RequirePermission` component:

```tsx
import { RequirePermission, useAuthorization } from '@/components/molecules/AuthorizationProvider';

function EventsPage() {
  const { hasPermission } = useAuthorization();

  return (
    <div>
      <h1>Events</h1>

      {/* Using the hook */}
      {hasPermission('events:create') && (
        <button onClick={handleCreateEvent}>Create New Event</button>
      )}

      {/* Using the component */}
      <RequirePermission permission="events:edit">
        <EditEventSection />
      </RequirePermission>
    </div>
  );
}
```

## Advanced Permission Features

### Multiple Permission Checks

Check if a user has any of several permissions:

```typescript
// Backend
const canManageEvents = await Promise.any([
  hasPermission(db, userId, 'events:create'),
  hasPermission(db, userId, 'events:edit'),
  hasPermission(db, userId, 'events:delete')
]).catch(() => false);

// Frontend
const { hasAnyPermission } = useAuthorization();
const canManageEvents = hasAnyPermission(['events:create', 'events:edit', 'events:delete']);
```

### Resource-Specific Permissions

For permissions tied to specific resources, use dynamic permission naming:

```typescript
// Check if user can edit a specific event
const eventId = '123';
const canEditThisEvent = await hasPermission(db, userId, `events:edit:${eventId}`);
```

## Managing Permissions

### Adding New Permissions

When adding new functionality to the application:

1. Add new permission records to the `permissions` table
2. Assign these permissions to appropriate roles in `role_permissions`
3. Update the migration files to include these permissions for new installations

### Updating Role Permissions

To modify the permissions assigned to a role:

1. Add new permissions:

   ```sql
   INSERT INTO role_permissions (role, permission_id)
   SELECT 'community_expert', id FROM permissions
   WHERE name = 'new:permission';
   ```

2. Remove permissions:
   ```sql
   DELETE FROM role_permissions
   WHERE role = 'community_expert'
   AND permission_id IN (SELECT id FROM permissions WHERE name = 'old:permission');
   ```

## Permission Audit and Debugging

When troubleshooting permission issues:

1. Check user roles:

   ```sql
   SELECT role FROM user_roles WHERE clerk_user_id = 'user_id';
   ```

2. Check role permissions:

   ```sql
   SELECT p.name FROM role_permissions rp
   JOIN permissions p ON rp.permission_id = p.id
   WHERE rp.role IN (SELECT role FROM user_roles WHERE clerk_user_id = 'user_id');
   ```

3. Use the frontend debugging tools:
   ```tsx
   const { userRoles, userPermissions } = useAuthorization();
   console.log({ userRoles, userPermissions });
   ```

## Best Practices

1. **Be Specific**: Create granular permissions for better security control
2. **Consistent Naming**: Follow the resource:action pattern consistently
3. **Documentation**: Keep a central list of all permissions and their meanings
4. **Default Deny**: Design systems to deny access by default, requiring explicit permission
5. **Regular Audit**: Periodically review permission assignments for adherence to principle of least privilege
