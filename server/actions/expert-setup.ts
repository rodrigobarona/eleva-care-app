'use server';

import { db } from '@/drizzle/db';
import { EventTable, ProfileTable, ScheduleTable, UserTable } from '@/drizzle/schema';
import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { count, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { fixInconsistentMetadata } from './fixes';

export type ExpertSetupStep =
  | 'profile'
  | 'availability'
  | 'events'
  | 'identity'
  | 'payment'
  | 'google_account';

// Helper function to check if a user has an expert role
function hasExpertRole(user: { publicMetadata?: Record<string, unknown> }): boolean {
  const roles = Array.isArray(user.publicMetadata?.role)
    ? (user.publicMetadata.role as string[])
    : [user.publicMetadata?.role as string];

  return roles.some((role: string) => role === 'community_expert' || role === 'top_expert');
}

/**
 * Safely marks a step as complete in the expert setup process without revalidation
 * This version is safe to call during server component rendering
 *
 * @param step The setup step to mark as complete
 * @returns Object containing success status and updated setup status
 */
export async function markStepCompleteNoRevalidate(step: ExpertSetupStep) {
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

    // If step is already marked as complete, don't do anything
    if (currentSetup[step]) {
      return {
        success: true,
        setupStatus: currentSetup,
      };
    }

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
 * Marks a step as complete in the expert setup process
 * This version calls revalidatePath and should NOT be used during server component rendering
 *
 * @param step The setup step to mark as complete
 * @returns Object containing success status and updated setup status
 */
export async function markStepComplete(step: ExpertSetupStep) {
  const result = await markStepCompleteNoRevalidate(step);

  // Only revalidate if the operation was successful
  if (result.success) {
    // Revalidate the layout path to update the UI
    revalidatePath('/(private)/layout');
  }

  return result;
}

/**
 * Checks the current status of the expert setup process by verifying database records
 *
 * @returns Object containing the current setup status
 */
export async function checkExpertSetupStatus() {
  try {
    // Get the current user
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Return the setup status from metadata
    const setupStatus = user.unsafeMetadata?.expertSetup || {};
    const isPublished = user.unsafeMetadata?.profile_published || false;

    // Fix any inconsistencies in the metadata
    await fixInconsistentMetadata(user.id);

    return {
      success: true,
      setupStatus,
      isPublished,
      revalidatePath: '/setup',
    };
  } catch (error) {
    console.error('Error checking expert setup status:', error);
    return {
      success: false,
      error: 'Failed to check expert setup status',
    };
  }
}

/**
 * Marks a step as complete for a specific user ID
 * This version is designed for webhook handlers where currentUser() isn't available
 *
 * @param step The setup step to mark as complete
 * @param userId The Clerk user ID to mark the step complete for
 * @returns Object containing success status and updated setup status
 */
export async function markStepCompleteForUser(step: ExpertSetupStep, userId: string) {
  try {
    // Initialize Clerk client
    const clerk = await clerkClient();

    // Get user by ID
    const user = await clerk.users.getUser(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if user has an expert role
    const isExpert = hasExpertRole(user);

    if (!isExpert) {
      return { success: false, error: 'User is not an expert' };
    }

    // Get current setup status
    const currentSetup = (user.unsafeMetadata?.expertSetup as Record<string, boolean>) || {};

    // If step is already marked as complete, don't do anything
    if (currentSetup[step]) {
      return {
        success: true,
        setupStatus: currentSetup,
      };
    }

    // Mark the step as complete
    const updatedSetup = {
      ...currentSetup,
      [step]: true,
    };

    // Update the user metadata
    await clerk.users.updateUser(user.id, {
      unsafeMetadata: {
        ...user.unsafeMetadata,
        expertSetup: updatedSetup,
      },
    });

    // Revalidate the layout path to update the UI when needed
    revalidatePath('/(private)/layout');

    return {
      success: true,
      setupStatus: updatedSetup,
    };
  } catch (error) {
    console.error('Failed to mark step complete for user:', error);
    return {
      success: false,
      error: 'Failed to mark step as complete',
    };
  }
}

/**
 * Updates the status of a single setup step
 *
 * @param stepId The ID of the step to update
 * @param completed Whether the step is complete or not
 * @returns Object containing success status and updated setup status
 */
export async function updateSetupStepStatus(stepId: string, completed: boolean) {
  try {
    // Get the current user
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Get the current metadata
    const currentMetadata = { ...user.unsafeMetadata };

    // Ensure expertSetup object exists
    if (!currentMetadata.expertSetup) {
      currentMetadata.expertSetup = {};
    }

    // Update the step status
    const expertSetup = currentMetadata.expertSetup as Record<string, boolean>;
    expertSetup[stepId] = completed;

    // Save the updated metadata
    const clerk = await clerkClient();
    await clerk.users.updateUser(user.id, {
      unsafeMetadata: currentMetadata,
    });

    revalidatePath('/setup');

    return {
      success: true,
      stepId,
      completed,
    };
  } catch (error) {
    console.error(`Error updating setup step ${stepId}:`, error);
    return {
      success: false,
      error: `Failed to update setup step ${stepId}`,
    };
  }
}

/**
 * Update the setup flow to ensure proper sequence of Identity before Connect
 */
export async function checkSetupSequence() {
  try {
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Check if user has an expert role
    const isExpert = hasExpertRole(user);
    if (!isExpert) {
      return {
        success: false,
        error: 'User is not an expert',
      };
    }

    // Get the DB user for more detailed info
    const dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, user.id),
    });

    if (!dbUser) {
      return {
        success: false,
        error: 'User not found in database',
      };
    }

    // Get current setup status
    const setupStatus = (user.unsafeMetadata?.expertSetup as Record<string, boolean>) || {};

    // Check identity verification status
    const identityVerified = dbUser.stripeIdentityVerified;

    // Check Connect account status
    const connectAccountId = dbUser.stripeConnectAccountId;
    const connectDetailsSubmitted = dbUser.stripeConnectDetailsSubmitted;

    return {
      success: true,
      setupStatus,
      identity: {
        verified: identityVerified,
        status: dbUser.stripeIdentityVerificationStatus,
        verificationId: dbUser.stripeIdentityVerificationId,
      },
      connect: {
        accountId: connectAccountId,
        detailsSubmitted: connectDetailsSubmitted,
        payoutsEnabled: dbUser.stripeConnectPayoutsEnabled,
        chargesEnabled: dbUser.stripeConnectChargesEnabled,
      },
      nextStep: !identityVerified
        ? 'identity'
        : !connectAccountId || !connectDetailsSubmitted
          ? 'connect'
          : null,
    };
  } catch (error) {
    console.error('Error checking setup sequence:', error);
    return {
      success: false,
      error: 'Failed to check setup sequence',
    };
  }
}
