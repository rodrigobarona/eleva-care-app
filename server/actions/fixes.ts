'use server';

import { getCachedUserById } from '@/lib/cache/clerk-cache';
import { invalidateUserCache } from '@/lib/cache/clerk-cache-utils';
import { clerkClient } from '@clerk/nextjs/server';

const STALE_COMPLETION_FLAGS = [
  'setup_completion_toast_shown',
  'setup_completion_toast_shown_at',
  'setup_completed_at',
];

/**
 * Helper function to clean up metadata and remove completion flags
 * This helps prevent inconsistent states in the expert setup flow
 */
export async function fixInconsistentMetadata(userId: string) {
  try {
    // Get the user using cached lookup
    const user = await getCachedUserById(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const unsafeMetadata = user.unsafeMetadata ?? {};

    // Nothing to clean: skip the write. This runs on every checkExpertSetupStatus
    // call (setup page, publish toggle, ...); writing unconditionally cost a Clerk
    // API call, a cache invalidation and a `user.updated` webhook each time.
    if (!STALE_COMPLETION_FLAGS.some((key) => key in unsafeMetadata)) {
      return { success: true };
    }

    // Create a clean metadata object without completion flags
    const cleanMetadata: Record<string, unknown> = {};

    // Copy all existing metadata except for specific completion flags
    for (const key in unsafeMetadata) {
      if (!STALE_COMPLETION_FLAGS.includes(key)) {
        cleanMetadata[key] = unsafeMetadata[key];
      }
    }

    // Update user metadata with the clean version
    const clerk = await clerkClient();
    await clerk.users.updateUser(userId, {
      unsafeMetadata: cleanMetadata,
    });

    // Invalidate cache after updating user metadata
    await invalidateUserCache(userId);

    return { success: true };
  } catch (error) {
    console.error('Error fixing inconsistent metadata:', error);
    return { success: false, error: 'Failed to fix inconsistent metadata' };
  }
}
