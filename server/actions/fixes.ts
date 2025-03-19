'use server';

import { clerkClient } from '@clerk/nextjs/server';

/**
 * Helper function to clean up metadata and remove completion flags
 * This helps prevent inconsistent states in the expert setup flow
 */
export async function fixInconsistentMetadata(userId: string) {
  try {
    // Get the user
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);

    // Create a clean metadata object without completion flags
    const cleanMetadata: Record<string, unknown> = {};

    // Copy all existing metadata except for specific completion flags
    for (const key in user.unsafeMetadata) {
      if (
        key !== 'setup_completion_toast_shown' &&
        key !== 'setup_completion_toast_shown_at' &&
        key !== 'setup_completed_at'
      ) {
        cleanMetadata[key] = user.unsafeMetadata[key];
      }
    }

    // Update user metadata with the clean version
    await clerk.users.updateUser(userId, {
      unsafeMetadata: cleanMetadata,
    });

    return { success: true };
  } catch (error) {
    console.error('Error fixing inconsistent metadata:', error);
    return { success: false, error: 'Failed to fix inconsistent metadata' };
  }
}
