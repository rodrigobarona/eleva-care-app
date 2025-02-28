import { auth, clerkClient } from '@clerk/nextjs/server';

import type { UserRole } from './roles';

/**
 * Server-side role management functions
 * These functions should only be used in Server Components or API routes
 */

/**
 * Check if the current user has the specified role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const userRole = user.publicMetadata.role as UserRole;
  return userRole === role;
}

/**
 * Get the current user's role
 */
export async function getUserRole(): Promise<UserRole> {
  const { userId } = await auth();
  if (!userId) return 'user';

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  return (user.publicMetadata.role as UserRole) || 'user';
}

/**
 * Update a user's role (requires admin/superadmin)
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) throw new Error('Unauthorized');

  // Check if current user has permission to update roles
  const clerk = await clerkClient();
  const currentUser = await clerk.users.getUser(currentUserId);
  const currentUserRole = currentUser.publicMetadata.role as UserRole;

  if (currentUserRole !== 'admin' && currentUserRole !== 'superadmin') {
    throw new Error('Insufficient permissions');
  }

  // Only superadmins can assign the superadmin role
  if (role === 'superadmin' && currentUserRole !== 'superadmin') {
    throw new Error('Only superadmins can assign the superadmin role');
  }

  await clerk.users.updateUser(userId, {
    publicMetadata: { role },
  });
}
