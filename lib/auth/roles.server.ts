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
 * Get the current user's role(s)
 */
export async function getUserRole(): Promise<UserRoles> {
  const { userId } = await auth();
  if (!userId) return 'user';

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  return (user.publicMetadata.role as UserRoles) || 'user';
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
  
  const isAdmin = userHasRole(currentUserRoles, 'admin');
  const isSuperAdmin = userHasRole(currentUserRoles, 'superadmin');

  if (!isAdmin && !isSuperAdmin) {
    throw new Error('Insufficient permissions');
  }

  // Only superadmins can assign the superadmin role
  const rolesToCheck = Array.isArray(roles) ? roles : [roles];
  
  if (rolesToCheck.includes('superadmin') && !isSuperAdmin) {
    throw new Error('Only superadmins can assign the superadmin role');
  }

  await clerk.users.updateUser(userId, {
    publicMetadata: { role: roles },
  });
}
