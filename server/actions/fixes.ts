'use server';

import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema-workos';
import { eq } from 'drizzle-orm';

/**
 * Helper function to clean up metadata and remove completion flags
 * This helps prevent inconsistent states in the expert setup flow
 * 
 * Note: With WorkOS, metadata management is simplified as we use database fields
 * instead of external user metadata. This function is kept for backward compatibility.
 */
export async function fixInconsistentMetadata(userId: string) {
  try {
    // Get the user from database
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, userId),
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // With WorkOS and database-first approach, metadata is simpler
    // We can clear specific flags if needed in the database
    // For now, this is a no-op as we don't store completion flags the same way

    console.log(`[fixes] Metadata cleanup called for user ${userId} (no-op with WorkOS)`);

    return { success: true, message: 'Metadata management handled by database' };
  } catch (error) {
    console.error('Error fixing inconsistent metadata:', error);
    return { success: false, error: 'Failed to fix inconsistent metadata' };
  }
}
