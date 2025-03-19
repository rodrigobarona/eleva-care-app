'use server';

import { db } from '@/drizzle/db';
import { ProfileTable } from '@/drizzle/schema';
import { hasRole } from '@/lib/auth/roles.server';
import { checkExpertSetupStatus } from '@/server/actions/expert-setup';
import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Toggles the publication status of an expert profile.
 * When publishing for the first time, verifies that all expert setup steps are complete.
 */
export async function toggleProfilePublication() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return { success: false, message: 'Not authenticated', isPublished: false };
  }

  // Check if user has expert role
  const isExpert = (await hasRole('community_expert')) || (await hasRole('top_expert'));
  if (!isExpert) {
    return { success: false, message: 'Not authorized', isPublished: false };
  }

  try {
    // Get current profile
    const profile = await db.query.ProfileTable.findFirst({
      where: eq(ProfileTable.clerkUserId, userId),
    });

    if (!profile) {
      return { success: false, message: 'Profile not found', isPublished: false };
    }

    // Calculate the target publication status
    const targetPublishedStatus = !profile.published;

    // If trying to publish (not unpublish), check if all steps are complete
    if (targetPublishedStatus === true) {
      // Check if all expert setup steps are complete
      const setupStatus = await checkExpertSetupStatus();

      // Handle different response structures
      const setupSteps = setupStatus.setupStatus || {};
      const allStepsComplete = Object.values(setupSteps).every(Boolean);

      if (!allStepsComplete) {
        // Create list of incomplete steps
        const incompleteSteps = Object.entries(setupSteps)
          .filter(([_, complete]) => !complete)
          .map(([step]) => step);

        return {
          success: false,
          message: 'Cannot publish profile until all setup steps are complete',
          isPublished: false,
          incompleteSteps,
        };
      }
    }
    // If unpublishing, we don't need to check for completion status - allow it regardless

    // Update the published status
    await db
      .update(ProfileTable)
      .set({ published: targetPublishedStatus })
      .where(eq(ProfileTable.clerkUserId, userId));

    // Revalidate paths where profile data might be displayed
    revalidatePath('/');
    revalidatePath('/experts');
    revalidatePath('/booking/expert/[username]');
    revalidatePath('/account');
    revalidatePath('/booking/expert');

    return {
      success: true,
      message: targetPublishedStatus ? 'Profile published successfully' : 'Profile unpublished',
      isPublished: targetPublishedStatus,
    };
  } catch (error) {
    console.error('Error toggling profile publication:', error);
    return {
      success: false,
      message: 'Failed to update profile publication status',
      isPublished: false,
    };
  }
}
