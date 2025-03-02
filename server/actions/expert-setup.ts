'use server';

import { db } from '@/drizzle/db';
import { EventTable, ProfileTable, ScheduleTable, UserTable } from '@/drizzle/schema';
import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { count, eq } from 'drizzle-orm';

export type ExpertSetupStep = 'profile' | 'availability' | 'events' | 'identity' | 'payment';

/**
 * Check if a user has an expert role
 * Supports both array and string formats for roles
 */
function hasExpertRole(user: { publicMetadata?: Record<string, unknown> }): boolean {
  const userRoles = user.publicMetadata?.role;

  if (Array.isArray(userRoles)) {
    // New format: role is an array of strings
    return userRoles.some((role) => role === 'community_expert' || role === 'top_expert');
  }

  if (typeof userRoles === 'string') {
    // Legacy format: role is a single string
    return userRoles === 'community_expert' || userRoles === 'top_expert';
  }

  return false;
}

/**
 * Marks a step as complete in the expert setup process
 *
 * @param step The setup step to mark as complete
 * @returns Object containing success status and updated setup status
 */
export async function markStepComplete(step: ExpertSetupStep) {
  try {
    // Get current user and verify authentication
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if user has an expert role
    const isExpert = hasExpertRole(user);

    if (!isExpert) {
      return { success: false, error: 'User is not an expert' };
    }

    // Get current setup status
    const currentSetup = (user.unsafeMetadata?.expertSetup as Record<string, boolean>) || {};

    // Mark the step as complete
    const updatedSetup = {
      ...currentSetup,
      [step]: true,
    };

    // Initialize Clerk client
    const clerk = await clerkClient();

    // Update the user metadata
    await clerk.users.updateUser(user.id, {
      unsafeMetadata: {
        ...user.unsafeMetadata,
        expertSetup: updatedSetup,
      },
    });

    return {
      success: true,
      setupStatus: updatedSetup,
      revalidatePath: '/(private)/layout' as const,
    };
  } catch (error) {
    console.error('Failed to mark step complete:', error);
    return {
      success: false,
      error: 'Failed to mark step as complete',
    };
  }
}

/**
 * Checks the current status of the expert setup process by verifying database records
 *
 * @returns Object containing the current setup status
 */
export async function checkExpertSetupStatus() {
  try {
    // Get current user and verify authentication
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if user has an expert role
    const isExpert = hasExpertRole(user);

    if (!isExpert) {
      return { success: false, error: 'User is not an expert' };
    }

    // Get current setup status from metadata
    const metadataSetup = (user.unsafeMetadata?.expertSetup as Record<string, boolean>) || {};

    // Create a new status object that will be updated based on database checks
    const setupStatus: Record<string, boolean> = {
      ...metadataSetup,
    };

    // Verify profile completion - Check if user has a profile in ProfileTable
    const profile = await db.query.ProfileTable.findFirst({
      where: eq(ProfileTable.clerkUserId, user.id),
    });
    setupStatus.profile =
      !!profile && !!profile.firstName && !!profile.lastName && !!profile.shortBio;

    // Verify availability - Check if user has a schedule with availabilities
    const schedule = await db.query.ScheduleTable.findFirst({
      where: eq(ScheduleTable.clerkUserId, user.id),
      with: { availabilities: true },
    });
    setupStatus.availability = !!schedule && schedule.availabilities.length > 0;

    // Verify events - Check if user has created at least one event
    const eventCount = await db
      .select({ count: count() })
      .from(EventTable)
      .where(eq(EventTable.clerkUserId, user.id));
    setupStatus.events = eventCount[0].count > 0;

    // Verify identity - Check user metadata for identity verification
    // This approach depends on how identity verification is tracked in your system
    setupStatus.identity =
      user.publicMetadata?.identityVerified === true ||
      user.unsafeMetadata?.identityVerified === true;

    // Verify payment setup - Check if user has completed Stripe Connect onboarding
    const dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, user.id),
    });
    setupStatus.payment =
      !!dbUser?.stripeConnectAccountId && !!dbUser?.stripeConnectOnboardingComplete;

    // Update metadata if database checks differ from stored metadata
    if (JSON.stringify(setupStatus) !== JSON.stringify(metadataSetup)) {
      // Initialize Clerk client
      const clerk = await clerkClient();

      await clerk.users.updateUser(user.id, {
        unsafeMetadata: {
          ...user.unsafeMetadata,
          expertSetup: setupStatus,
        },
      });
    }

    return {
      success: true,
      setupStatus,
      revalidatePath: '/(private)/layout' as const,
    };
  } catch (error) {
    console.error('Failed to check setup status:', error);
    return {
      success: false,
      error: 'Failed to retrieve setup status',
    };
  }
}
