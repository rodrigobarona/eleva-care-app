import { db } from '@/drizzle/db';
import { RolesTable } from '@/drizzle/schema-workos';
import {
  ADMIN_ROLES,
  ROLE_ADMIN,
  ROLE_COMMUNITY_EXPERT,
  ROLE_SUPERADMIN,
  ROLE_TOP_EXPERT,
  ROLE_USER,
} from '@/lib/constants/roles';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { eq } from 'drizzle-orm';

import type { UserRole, UserRoles } from './roles';

/**
 * Server-side role management functions
 * These functions should only be used in Server Components or API routes
 */

/**
 * Helper function to get user roles from database
 */
async function getUserRolesFromDB(workosUserId: string): Promise<UserRole[]> {
  const userRoles = await db
    .select({ role: RolesTable.role })
    .from(RolesTable)
    .where(eq(RolesTable.workosUserId, workosUserId));

  return userRoles.map((r) => r.role as UserRole);
}


/**
 * Middleware helper function to check if a user has any of the specified roles
 * @param userRoles - User roles from session metadata (string, array, or undefined)
 * @param requiredRoles - Array of roles to check against
 * @returns boolean indicating if the user has any of the required roles
 */
export function checkRoles(
  userRoles: string | string[] | unknown,
  requiredRoles: readonly string[],
): boolean {
  // Handle cases where userRoles is undefined/null
  if (!userRoles) return false;

  // Convert to array if it's a string
  const rolesArray = Array.isArray(userRoles)
    ? userRoles
    : typeof userRoles === 'string'
      ? [userRoles]
      : [];

  // Convert everything to lowercase for case-insensitive comparison
  const normalizedUserRoles = rolesArray.map((r) => r.toLowerCase());
  const normalizedRequiredRoles = requiredRoles.map((r) => r.toLowerCase());

  return normalizedUserRoles.some((role) => normalizedRequiredRoles.includes(role));
}

/**
 * Check if the current user has any of the specified roles
 */
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  const { user } = await withAuth();
  if (!user) return false;

  const userRoles = await getUserRolesFromDB(user.id);

  if (userRoles.length === 0) return false;

  // Check if user has any of the required roles
  return roles.some((role) => userRoles.includes(role));
}

/**
 * Check if the current user has the specified role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const { user } = await withAuth();
  if (!user) return false;

  const userRoles = await getUserRolesFromDB(user.id);

  return userRoles.includes(role);
}

/**
 * Convenience function to check if user is an admin or superadmin
 */
export async function isAdmin(): Promise<boolean> {
  return hasAnyRole([...ADMIN_ROLES] as UserRole[]);
}

/**
 * Convenience function to check if user is any type of expert
 */
export async function isExpert(): Promise<boolean> {
  return hasAnyRole([ROLE_TOP_EXPERT, ROLE_COMMUNITY_EXPERT]);
}

/**
 * Convenience function to check if user is a top expert
 */
export async function isTopExpert(): Promise<boolean> {
  return hasRole(ROLE_TOP_EXPERT);
}

/**
 * Convenience function to check if user is a community expert
 */
export async function isCommunityExpert(): Promise<boolean> {
  return hasRole(ROLE_COMMUNITY_EXPERT);
}

/**
 * Get the current user's role(s)
 */
export async function getUserRole(): Promise<UserRoles> {
  const { user } = await withAuth();
  if (!user) return ROLE_USER;

  const userRoles = await getUserRolesFromDB(user.id);

  if (userRoles.length === 0) return ROLE_USER;
  if (userRoles.length === 1) return userRoles[0];

  return userRoles;
}

/**
 * Update a user's role(s) (requires admin/superadmin)
 */
export async function updateUserRole(workosUserId: string, roles: UserRoles): Promise<void> {
  const { user: currentUser } = await withAuth();
  if (!currentUser) throw new Error('Unauthorized');

  // Check if current user has permission to update roles
  const currentUserRoles = await getUserRolesFromDB(currentUser.id);

  const isAdmin = currentUserRoles.includes(ROLE_ADMIN);
  const isSuperAdmin = currentUserRoles.includes(ROLE_SUPERADMIN);

  if (!isAdmin && !isSuperAdmin) {
    throw new Error('Insufficient permissions');
  }

  // Only superadmins can assign the superadmin role
  const rolesToAssign = Array.isArray(roles) ? roles : [roles];

  if (rolesToAssign.includes(ROLE_SUPERADMIN) && !isSuperAdmin) {
    throw new Error('Only superadmins can assign the superadmin role');
  }

  // Delete existing roles for this user
  await db.delete(RolesTable).where(eq(RolesTable.workosUserId, workosUserId));

  // Insert new roles
  const roleInserts = rolesToAssign.map((role) => ({
    workosUserId,
    role,
  }));

  await db.insert(RolesTable).values(roleInserts);
}
