import { db } from '@/drizzle/db';
import { PermissionTable, RolePermissionTable, UserRoleTable, UserTable } from '@/drizzle/schema';
import { and, eq, inArray } from 'drizzle-orm';

export type UserRole = 'superadmin' | 'admin' | 'top_expert' | 'community_expert' | 'user';

/**
 * Check if a user has the specified role
 */
export async function hasRole(clerkUserId: string, role: UserRole): Promise<boolean> {
  const roles = await db.query.UserRoleTable.findMany({
    where: eq(UserRoleTable.clerkUserId, clerkUserId),
  });

  return roles.some((r) => r.role === role);
}

/**
 * Check if a user has the specified permission
 */
export async function hasPermission(clerkUserId: string, permission: string): Promise<boolean> {
  // Get user roles
  const userRoles = await db.query.UserRoleTable.findMany({
    where: eq(UserRoleTable.clerkUserId, clerkUserId),
  });

  if (userRoles.length === 0) {
    return false;
  }

  // Extract role names
  const roles = userRoles.map((r) => r.role);

  // Find the permission
  const permissionRecord = await db.query.PermissionTable.findFirst({
    where: eq(PermissionTable.name, permission),
  });

  if (!permissionRecord) {
    return false;
  }

  // Check if any of the user's roles have this permission
  const rolePermissions = await db.query.RolePermissionTable.findMany({
    where: (fields, { and, eq, inArray }) =>
      and(eq(fields.permissionId, permissionRecord.id), inArray(fields.role, roles)),
  });

  return rolePermissions.length > 0;
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(clerkUserId: string): Promise<UserRole[]> {
  const roles = await db.query.UserRoleTable.findMany({
    where: eq(UserRoleTable.clerkUserId, clerkUserId),
  });

  return roles.map((r) => r.role as UserRole);
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(clerkUserId: string): Promise<string[]> {
  // Get user roles
  const userRoles = await db.query.UserRoleTable.findMany({
    where: eq(UserRoleTable.clerkUserId, clerkUserId),
  });

  if (userRoles.length === 0) {
    return [];
  }

  // Extract role names
  const roles = userRoles.map((r) => r.role);

  // Get all permissions for these roles
  const rolePermissions = await db.query.RolePermissionTable.findMany({
    where: inArray(RolePermissionTable.role, roles),
    with: {
      permission: true,
    },
  });

  // Extract and deduplicate permission names
  const permissions = [...new Set(rolePermissions.map((rp) => rp.permission.name))];

  return permissions;
}

/**
 * Assign a role to a user
 */
export async function assignRole(
  targetUserId: string,
  role: UserRole,
  assignedByUserId: string,
): Promise<boolean> {
  try {
    // Check if user already has this role
    const existingRole = await db.query.UserRoleTable.findFirst({
      where: (fields, { and, eq }) =>
        and(eq(fields.clerkUserId, targetUserId), eq(fields.role, role)),
    });

    if (existingRole) {
      return true; // Already has role
    }

    // Add the role
    await db.insert(UserRoleTable).values({
      clerkUserId: targetUserId,
      role,
      assignedBy: assignedByUserId,
    });

    // Update primary role if it's a higher privilege
    // Role priority: superadmin > admin > top_expert > community_expert > user
    const rolePriority = {
      superadmin: 5,
      admin: 4,
      top_expert: 3,
      community_expert: 2,
      user: 1,
    };

    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, targetUserId),
    });

    if (
      user &&
      rolePriority[role as keyof typeof rolePriority] >
        rolePriority[user.primaryRole as keyof typeof rolePriority]
    ) {
      await db
        .update(UserTable)
        .set({ primaryRole: role })
        .where(eq(UserTable.clerkUserId, targetUserId));
    }

    return true;
  } catch (error) {
    console.error('Error assigning role:', error);
    return false;
  }
}

/**
 * Remove a role from a user
 */
export async function removeRole(targetUserId: string, role: UserRole): Promise<boolean> {
  try {
    // Delete the role
    await db
      .delete(UserRoleTable)
      .where(and(eq(UserRoleTable.clerkUserId, targetUserId), eq(UserRoleTable.role, role)));

    // If this was the user's primary role, set a new primary role
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, targetUserId),
    });

    if (user && user.primaryRole === role) {
      // Get remaining roles
      const remainingRoles = await db.query.UserRoleTable.findMany({
        where: eq(UserRoleTable.clerkUserId, targetUserId),
      });

      if (remainingRoles.length > 0) {
        // Find the highest priority role
        const rolePriority = {
          superadmin: 5,
          admin: 4,
          top_expert: 3,
          community_expert: 2,
          user: 1,
        };

        const highestRole = remainingRoles.reduce((prev, current) => {
          const prevPriority = rolePriority[prev.role as keyof typeof rolePriority];
          const currentPriority = rolePriority[current.role as keyof typeof rolePriority];
          return prevPriority > currentPriority ? prev : current;
        });

        // Update the primary role
        await db
          .update(UserTable)
          .set({ primaryRole: highestRole.role })
          .where(eq(UserTable.clerkUserId, targetUserId));
      } else {
        // If no roles remain, set to basic user
        await db
          .update(UserTable)
          .set({ primaryRole: 'user' })
          .where(eq(UserTable.clerkUserId, targetUserId));

        // Add the basic user role
        await db.insert(UserRoleTable).values({
          clerkUserId: targetUserId,
          role: 'user',
          assignedBy: 'system',
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Error removing role:', error);
    return false;
  }
}
