import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Get a user by their Clerk user ID
 * This is a common utility function used across the application
 */
export async function getUserByClerkId(clerkUserId: string) {
  if (!clerkUserId) return null;

  try {
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, clerkUserId),
    });

    return user;
  } catch (error) {
    console.error('Error fetching user by Clerk ID:', error);
    return null;
  }
}
