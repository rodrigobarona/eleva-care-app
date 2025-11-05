'use server';

import { db } from '@/drizzle/db';
import { ProfilesTable, UsersTable } from '@/drizzle/schema-workos';
import { getCachedUserById } from '@/lib/cache/clerk-cache';
import { invalidateUserCache } from '@/lib/cache/clerk-cache-utils';
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { fixInconsistentMetadata } from './fixes';

export type ExpertSetupStep =
  | 'profile'
  | 'availability'
  | 'events'
  | 'identity'
  | 'payment'
  | 'google_account';

// Action result type for consistent return patterns
type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

// Helper function to check if a user has an expert role
function hasExpertRole(user: { publicMetadata?: Record<string, unknown> }): boolean {
  const roles = Array.isArray(user.publicMetadata?.role)
    ? (user.publicMetadata.role as string[])
    : [user.publicMetadata?.role as string];

  return roles.some((role: string) => role === 'community_expert' || role === 'top_expert');
}

/**
 * Checks if all setup steps are completed and updates the setupComplete flag
 *
 * @param setupStatus The current setup status object
 * @returns true if all steps are completed, false otherwise
 */
function areAllStepsCompleted(setupStatus: Record<string, boolean>): boolean {
  const requiredSteps: ExpertSetupStep[] = [
    'profile',
    'availability',
    'events',
    'identity',
    'payment',
    'google_account',
  ];

  return requiredSteps.every((step) => setupStatus[step] === true);
}

/**
 * Updates the setupComplete flag in the user's metadata
 *
 * @param userId The Clerk user ID
 * @param setupStatus The current setup status object
 * @returns void
 */
async function updateSetupCompleteFlag(userId: string, setupStatus: Record<string, boolean>) {
  try {
    // Initialize Clerk client
    const clerk = await clerkClient();

    // Get user by ID using cached lookup
    const user = await getCachedUserById(userId);

    if (!user) {
      console.error('User not found when updating setup complete flag');
      return;
    }

    const isComplete = areAllStepsCompleted(setupStatus);

    // Only update if the setupComplete flag needs to change
    if (user.unsafeMetadata?.setupComplete !== isComplete) {
      await clerk.users.updateUser(userId, {
        unsafeMetadata: {
          ...user.unsafeMetadata,
          setupComplete: isComplete,
        },
      });

      // Invalidate cache after updating user metadata
      await invalidateUserCache(userId);

      console.log(`Updated setupComplete flag to ${isComplete} for user ${userId}`);
    }
  } catch (error) {
    console.error('Failed to update setup complete flag:', error);
  }
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

    // Invalidate cache after updating user metadata
    await invalidateUserCache(user.id);

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
    // Update setupComplete flag if needed
    if (result.setupStatus) {
      const user = await currentUser();
      if (user) {
        await updateSetupCompleteFlag(user.id, result.setupStatus);
      }
    }

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

    // Get the setup status from metadata
    const setupStatus = user.unsafeMetadata?.expertSetup || {};

    // Get the published status directly from the database (single source of truth)
    const profile = await db.query.ProfilesTable.findFirst({
      where: eq(ProfilesTable.workosUserId, user.id),
      columns: {
        published: true,
      },
    });
    const isPublished = profile?.published ?? false;

    // Check if the setupComplete flag is out of sync and update if needed
    const isSetupComplete = user.unsafeMetadata?.setupComplete === true;
    const allStepsComplete = areAllStepsCompleted(setupStatus as Record<string, boolean>);

    if (isSetupComplete !== allStepsComplete) {
      await updateSetupCompleteFlag(user.id, setupStatus as Record<string, boolean>);
    }

    // Fix any inconsistencies in the metadata
    await fixInconsistentMetadata(user.id);

    return {
      success: true,
      setupStatus,
      isPublished,
      isSetupComplete: isSetupComplete || allStepsComplete,
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

    // Get user by ID using cached lookup
    const user = await getCachedUserById(userId);

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

    // Invalidate cache after updating user metadata
    await invalidateUserCache(userId);

    // Check if all steps are completed and update the setupComplete flag
    await updateSetupCompleteFlag(userId, updatedSetup);

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

    // Invalidate cache after updating user metadata
    await invalidateUserCache(user.id);

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
    const dbUser = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, user.id),
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

/**
 * Marks the Google account connection step as complete or incomplete for the current authenticated expert user after verifying Google account status.
 *
 * Returns a success result if the user is authenticated, has an expert role, and the Google account status was properly updated.
 *
 * @returns An action result indicating success or failure, with `data` set to `true` if the step was updated.
 */
export async function handleGoogleAccountConnection(): Promise<ActionResult<boolean>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    console.log(`🔍 Checking Google account connection for user ${userId}`);

    // Get the current user to check for external accounts and roles using cached lookup
    const clerk = await clerkClient();
    const user = await getCachedUserById(userId);

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Check if user has an expert role first
    const isExpert = hasExpertRole(user);
    if (!isExpert) {
      console.log(`ℹ️ User ${userId} is not an expert, skipping expert setup metadata update`);
      return {
        success: false,
        error: 'User is not an expert',
      };
    }

    // Check if user has a verified Google external account
    const hasVerifiedGoogleAccount = user.externalAccounts.some(
      (account) => account.provider === 'google' && account.verification?.status === 'verified',
    );

    console.log(
      `🔍 User ${userId} has ${hasVerifiedGoogleAccount ? 'a' : 'no'} verified Google account`,
    );

    // Get current metadata
    const currentMetadata = user.unsafeMetadata as {
      expertSetup?: Record<ExpertSetupStep, boolean>;
    };

    // Update the expertSetup metadata
    const expertSetup = {
      ...(currentMetadata?.expertSetup || {}),
      google_account: hasVerifiedGoogleAccount,
    };

    // Only update if the status has changed
    if (currentMetadata?.expertSetup?.google_account !== hasVerifiedGoogleAccount) {
      await clerk.users.updateUser(userId, {
        unsafeMetadata: {
          ...currentMetadata,
          expertSetup,
        },
      });

      // Invalidate cache after updating user metadata
      await invalidateUserCache(userId);

      console.log(
        `✅ Updated Google account connection status to ${hasVerifiedGoogleAccount} for expert user ${userId}`,
      );

      // Check if all steps are completed and update setupComplete flag
      await updateSetupCompleteFlag(userId, expertSetup);
    } else {
      console.log(`ℹ️ Google account status already up to date for user ${userId}`);
    }

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    console.error('Error handling Google account connection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update Google account status',
    };
  }
}

/**
 * Updates the status of a specific setup step for a user (true or false)
 * This version is designed for webhook handlers where we need to set steps to false
 *
 * @param step The setup step to update
 * @param userId The Clerk user ID to update the step for
 * @param completed Whether the step is completed (true) or not (false)
 * @returns Object containing success status and updated setup status
 */
export async function updateSetupStepForUser(
  step: ExpertSetupStep,
  userId: string,
  completed: boolean,
) {
  try {
    // Initialize Clerk client
    const clerk = await clerkClient();

    // Get user by ID using cached lookup
    const user = await getCachedUserById(userId);

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

    // If step is already at the desired status, don't do anything
    if (currentSetup[step] === completed) {
      return {
        success: true,
        setupStatus: currentSetup,
      };
    }

    // Update the step status
    const updatedSetup = {
      ...currentSetup,
      [step]: completed,
    };

    // Update the user metadata
    await clerk.users.updateUser(user.id, {
      unsafeMetadata: {
        ...user.unsafeMetadata,
        expertSetup: updatedSetup,
      },
    });

    // Invalidate cache after updating user metadata
    await invalidateUserCache(userId);

    // Check if all steps are completed and update the setupComplete flag
    await updateSetupCompleteFlag(userId, updatedSetup);

    // Revalidate the layout path to update the UI when needed
    revalidatePath('/(private)/layout');

    return {
      success: true,
      setupStatus: updatedSetup,
    };
  } catch (error) {
    console.error('Failed to update setup step for user:', error);
    return {
      success: false,
      error: 'Failed to update setup step',
    };
  }
}

/**
 * Manually syncs the Google account connection status for the current authenticated expert user.
 * This can be called from the frontend as a fallback when webhooks might not trigger properly.
 *
 * @returns An action result indicating success or failure
 */
export async function syncGoogleAccountConnectionStatus(): Promise<ActionResult<boolean>> {
  try {
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    console.log(`🔍 Manually syncing Google account connection for user ${user.id}`);

    // Check if user has an expert role first
    const isExpert = hasExpertRole(user);
    if (!isExpert) {
      console.log(`ℹ️ User ${user.id} is not an expert, skipping expert setup metadata update`);
      return {
        success: false,
        error: 'User is not an expert',
      };
    }

    // Check if user has a verified Google external account
    const hasVerifiedGoogleAccount = user.externalAccounts.some(
      (account) => account.provider === 'google' && account.verification?.status === 'verified',
    );

    console.log(
      `🔍 User ${user.id} has ${hasVerifiedGoogleAccount ? 'a' : 'no'} verified Google account`,
    );

    // Get current expert setup data
    const currentSetup = (user.unsafeMetadata?.expertSetup as Record<string, boolean>) || {};
    const currentGoogleStatus = currentSetup.google_account === true;

    // Only update if the status has changed
    if (currentGoogleStatus !== hasVerifiedGoogleAccount) {
      console.log(
        `📝 Updating Google account connection status from ${currentGoogleStatus} to ${hasVerifiedGoogleAccount} for expert user ${user.id}`,
      );

      // Update the step status
      const result = await updateSetupStepForUser(
        'google_account',
        user.id,
        hasVerifiedGoogleAccount,
      );

      if (result.success) {
        console.log(
          `✅ Successfully synced Google account connection status to ${hasVerifiedGoogleAccount} for expert user ${user.id}`,
        );
        return {
          success: true,
          data: hasVerifiedGoogleAccount,
        };
      } else {
        console.error(`❌ Failed to sync Google account status for user ${user.id}:`, result.error);
        return {
          success: false,
          error: result.error,
        };
      }
    } else {
      console.log(`ℹ️ Google account status already up to date for user ${user.id}`);
      return {
        success: true,
        data: hasVerifiedGoogleAccount,
      };
    }
  } catch (error) {
    console.error('Error syncing Google account connection status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync Google account status',
    };
  }
}
