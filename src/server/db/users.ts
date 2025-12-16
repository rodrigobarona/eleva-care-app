/**
 * User Database Queries
 *
 * Server-side database queries for user data.
 * Uses Drizzle ORM with Neon Postgres.
 */
import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema';
import { eq, isNull } from 'drizzle-orm';

/**
 * Minimal user type for public profiles
 *
 * Note: firstName/lastName removed (Phase 5)
 * - For legal name: Fetch from WorkOS API using getWorkOSUser()
 * - For public display name: Use ProfilesTable.firstName/lastName
 */
export type MinimalUser = {
  id: string;
  workosUserId: string;
  email: string;
  username: string | null;
  imageUrl: string | null;
  role: string;
};

/**
 * Get user by username (for /[username] routes)
 *
 * @param username - The username to look up
 * @returns User data or null if not found
 *
 * @example
 * ```typescript
 * const user = await getUserByUsername('dr-maria');
 * if (user) {
 *   console.log(user.email);
 * }
 * ```
 */
export async function getUserByUsername(username: string): Promise<MinimalUser | null> {
  try {
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.username, username.toLowerCase()),
      columns: {
        id: true,
        workosUserId: true,
        email: true,
        username: true,
        imageUrl: true,
        role: true,
      },
    });

    return user || null;
  } catch (error) {
    console.error('Error fetching user by username:', error);
    return null;
  }
}

/**
 * Get user by WorkOS user ID
 *
 * @param workosUserId - The WorkOS user ID
 * @returns User data or null if not found
 */
export async function getUserByWorkosId(workosUserId: string): Promise<MinimalUser | null> {
  try {
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, workosUserId),
      columns: {
        id: true,
        workosUserId: true,
        email: true,
        username: true,
        imageUrl: true,
        role: true,
      },
    });

    return user || null;
  } catch (error) {
    console.error('Error fetching user by WorkOS ID:', error);
    return null;
  }
}

/**
 * Check if a username is available
 *
 * @param username - The username to check
 * @returns True if available, false if taken
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  try {
    const existing = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.username, username.toLowerCase()),
      columns: { id: true },
    });

    return !existing;
  } catch (error) {
    console.error('Error checking username availability:', error);
    return false;
  }
}

/**
 * Update user's username
 *
 * @param workosUserId - The WorkOS user ID
 * @param username - The new username
 * @returns True if successful, false otherwise
 */
export async function updateUsername(workosUserId: string, username: string): Promise<boolean> {
  try {
    await db
      .update(UsersTable)
      .set({
        username: username.toLowerCase(),
        updatedAt: new Date(),
      })
      .where(eq(UsersTable.workosUserId, workosUserId));

    return true;
  } catch (error) {
    console.error('Error updating username:', error);
    return false;
  }
}

/**
 * Get users without usernames (for migration/backfill)
 *
 * @param limit - Maximum number of users to return
 * @returns Array of users without usernames
 */
export async function getUsersWithoutUsernames(limit: number = 100): Promise<MinimalUser[]> {
  try {
    const users = await db.query.UsersTable.findMany({
      where: isNull(UsersTable.username),
      limit,
      columns: {
        id: true,
        workosUserId: true,
        email: true,
        username: true,
        imageUrl: true,
        role: true,
      },
    });

    return users as MinimalUser[];
  } catch (error) {
    console.error('Error fetching users without usernames:', error);
    return [];
  }
}
