import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Get a user by their Clerk user ID
 * This is a common utility function used across the application
 */
export async function getUserByClerkId(workosUserId: string) {
  if (!workosUserId) return null;

  try {
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, workosUserId),
    });

    return user;
  } catch (error) {
    console.error('Error fetching user by Clerk ID:', error);
    return null;
  }
}
