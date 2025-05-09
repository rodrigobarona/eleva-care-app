import {
  ADMIN_ROLES,
  ROLE_ADMIN,
  ROLE_COMMUNITY_EXPERT,
  ROLE_SUPERADMIN,
  ROLE_TOP_EXPERT,
  ROLE_USER,
} from '@/lib/constants/roles';
import { auth, clerkClient } from '@clerk/nextjs/server';

import type { UserRole, UserRoles } from './roles';

/**
 * Server-side role management functions
 * These functions should only be used in Server Components or API routes
 */

/**
 * Helper function to check if a user has a specific role
 */
function userHasRole(userRoles: UserRoles, roleToCheck: UserRole): boolean {
  if (Array.isArray(userRoles)) {
    return userRoles.includes(roleToCheck);
  }
  return userRoles === roleToCheck;
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
  const { userId } = await auth();
  if (!userId) return false;

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const userRoles = user.publicMetadata.role as UserRoles;

  if (!userRoles) return false;

  // Check if user has any of the required roles
  if (Array.isArray(userRoles)) {
    return roles.some((role) => userRoles.includes(role));
  }

  // String role case
  return roles.includes(userRoles);
}

/**
 * Check if the current user has the specified role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const userRoles = user.publicMetadata.role as UserRoles;

  return userHasRole(userRoles, role);
}

/**
 * Convenience function to check if user is an admin or superadmin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { userId } = await auth();
    if (!userId) return false;

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const userRoles = user.publicMetadata.role as UserRoles;

    // Debug log to help troubleshoot
    console.log('User roles from metadata:', JSON.stringify(userRoles));

    // Handle both array and string role formats
    if (Array.isArray(userRoles)) {
      return userRoles.some((role) => ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]));
    }

    if (typeof userRoles === 'string') {
      return ADMIN_ROLES.includes(userRoles as (typeof ADMIN_ROLES)[number]);
    }

    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
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
  const { userId } = await auth();
  if (!userId) return ROLE_USER;

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  return (user.publicMetadata.role as UserRoles) || ROLE_USER;
}

/**
 * Update a user's role(s) (requires admin/superadmin)
 */
export async function updateUserRole(userId: string, roles: UserRoles): Promise<void> {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) throw new Error('Unauthorized');

  // Check if current user has permission to update roles
  const clerk = await clerkClient();
  const currentUser = await clerk.users.getUser(currentUserId);
  const currentUserRoles = currentUser.publicMetadata.role as UserRoles;

  const isAdmin = userHasRole(currentUserRoles, ROLE_ADMIN);
  const isSuperAdmin = userHasRole(currentUserRoles, ROLE_SUPERADMIN);

  if (!isAdmin && !isSuperAdmin) {
    throw new Error('Insufficient permissions');
  }

  // Only superadmins can assign the superadmin role
  const rolesToCheck = Array.isArray(roles) ? roles : [roles];

  if (rolesToCheck.includes(ROLE_SUPERADMIN) && !isSuperAdmin) {
    throw new Error('Only superadmins can assign the superadmin role');
  }

  await clerk.users.updateUser(userId, {
    publicMetadata: { role: roles },
  });
}
