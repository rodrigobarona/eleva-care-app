import { db } from '@/drizzle/db';
import { UserRoleTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

export type Role = 'superadmin' | 'admin' | 'top_expert' | 'community_expert' | 'user';

/**
 * Check if the current user has any of the specified roles
 *
 * @param requiredRoles An array of roles to check against
 * @returns Boolean indicating if the user has any of the required roles
 */
export async function checkHasRole(requiredRoles: Role[]): Promise<boolean> {
  const { userId } = await auth();

  if (!userId) {
    return false;
  }

  const userRoles = await db.query.UserRoleTable.findMany({
    where: eq(UserRoleTable.clerkUserId, userId),
  });

  const roles = userRoles.map((ur) => ur.role);

  return roles.some((role) => requiredRoles.includes(role as Role));
}

/**
 * Verify that a user has the superadmin role
 *
 * @returns Boolean indicating if the user is a superadmin
 */
export async function checkIsSuperAdmin(): Promise<boolean> {
  return checkHasRole(['superadmin']);
}

/**
 * Fetch all roles for the current user
 *
 * @returns Array of role names
 */
export async function getCurrentUserRoles(): Promise<string[]> {
  const { userId } = await auth();

  if (!userId) {
    return [];
  }

  const userRoles = await db.query.UserRoleTable.findMany({
    where: eq(UserRoleTable.clerkUserId, userId),
  });

  return userRoles.map((ur) => ur.role);
}
