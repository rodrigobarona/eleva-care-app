'use server';

import { db } from '@/drizzle/db';
import { EventTable, ProfileTable, ScheduleTable, UserTable } from '@/drizzle/schema';
import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { count, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

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

    // Initialize setup status object
    const setupStatus: Record<string, boolean> = {
      profile: false,
      availability: false,
      events: false,
      identity: false,
      payment: false,
      google_account: false,
    };

    // Perform database checks to verify actual completion status
    // Get the user from the database
    const dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, user.id),
    });

    // Check profile completion (name and bio required)
    const dbProfile = await db.query.ProfileTable.findFirst({
      where: eq(ProfileTable.clerkUserId, user.id),
    });
    setupStatus.profile = !!dbProfile?.firstName && !!dbProfile?.lastName && !!dbProfile?.shortBio;

    // Verify availability - Check if user has a schedule with availabilities
    const schedule = await db.query.ScheduleTable.findFirst({
      where: eq(ScheduleTable.clerkUserId, user.id),
    });
    setupStatus.availability = !!schedule;

    // Verify events - Check if user has created at least one published event
    const eventCount = await db
      .select({ count: count() })
      .from(EventTable)
      .where(eq(EventTable.clerkUserId, user.id))
      .then((result: { count: number }[]) => result[0]?.count || 0);
    setupStatus.events = eventCount > 0;

    // Verify identity - Enhanced Stripe identity verification check
    setupStatus.identity = false; // Default to false

    // Only trust Stripe identity verification - no fallbacks
    if (dbUser) {
      // Log for debugging
      console.log('Checking identity verification:', {
        userId: user.id,
        stripeIdentityVerificationId: dbUser.stripeIdentityVerificationId,
        stripeIdentityVerified: dbUser.stripeIdentityVerified,
      });

      // Strict validation: Must have both a verification ID and verified=true
      if (dbUser.stripeIdentityVerificationId && dbUser.stripeIdentityVerified === true) {
        // Only set as verified if all conditions pass
        setupStatus.identity = true;

        console.log('Identity verification passed:', {
          verificationId: dbUser.stripeIdentityVerificationId,
        });
      } else {
        // Helpful debug logging for why verification failed
        const reasons = [];
        if (!dbUser.stripeIdentityVerificationId) reasons.push('No verification ID');
        if (dbUser.stripeIdentityVerified !== true) reasons.push('Not marked as verified');

        console.log('Identity verification incomplete:', {
          userId: user.id,
          reasons,
        });
      }
    } else {
      console.log('User record not found in database, identity verification failed');
    }

    // Remove any old metadata about identity verification to prevent confusion
    // On next metadata update, any incorrect flags will be removed
    if (metadataSetup.identity !== setupStatus.identity) {
      console.log('Correcting identity verification in metadata:', {
        old: metadataSetup.identity,
        new: setupStatus.identity,
      });
    }

    // Verify payment setup - Check if user has completed Stripe Connect onboarding
    setupStatus.payment =
      !!dbUser?.stripeConnectAccountId && !!dbUser?.stripeConnectOnboardingComplete;

    // Verify Google account connection - Using only actual OAuth connections
    console.log('External accounts:', user.externalAccounts);

    // Only method that matters: Check for Google external account OAuth connection
    const externalAccounts = user.externalAccounts || [];
    const hasGoogleExternalAccount = externalAccounts.some(
      (account) =>
        account.provider === 'google' &&
        (account.verification?.status === 'verified' ||
          account.verification?.status === 'unverified'),
    );

    // Log detailed information about the Google account verification
    console.log('Google account verification in expert setup check:', {
      hasGoogleExternalAccount,
      previousValue: metadataSetup?.google_account,
      externalAccountsCount: externalAccounts.length,
      externalAccounts: externalAccounts.map((a) => ({
        provider: a.provider,
        verification: a.verification?.status,
        email: a.emailAddress,
      })),
    });

    // Set the status for Google account connection - ONLY using OAuth connection
    setupStatus.google_account = hasGoogleExternalAccount;

    // Detailed logging for debugging purposes
    console.log('Google account verification:', {
      hasGoogleExternalAccount,
      result: setupStatus.google_account,
      previousValue: metadataSetup?.google_account,
      changed: metadataSetup?.google_account !== setupStatus.google_account,
      externalAccountsCount: externalAccounts.length,
      externalAccounts: externalAccounts.map((a) => ({
        provider: a.provider,
        verification: a.verification?.status,
        email: a.emailAddress,
      })),
    });

    // Explicitly checking if we need to update the Google account status
    const googleAccountChanged = metadataSetup?.google_account !== setupStatus.google_account;
    if (googleAccountChanged) {
      console.log(
        `Google account status change detected: ${metadataSetup?.google_account} -> ${setupStatus.google_account}`,
      );
    }

    // Update metadata if database checks differ from stored metadata
    if (JSON.stringify(setupStatus) !== JSON.stringify(metadataSetup)) {
      // Initialize Clerk client
      const clerk = await clerkClient();

      console.log('Updating user metadata with new expert setup status', {
        userId: user.id,
        before: metadataSetup,
        after: setupStatus,
      });

      try {
        await clerk.users.updateUser(user.id, {
          unsafeMetadata: {
            ...user.unsafeMetadata,
            expertSetup: setupStatus,
          },
        });
        console.log('Successfully updated user metadata');
      } catch (updateError) {
        console.error('Failed to update user metadata:', updateError);
      }

      // Revalidate the layout path when the status changes
      revalidatePath('/(private)/layout');
    }

    return {
      success: true,
      setupStatus,
      isPublished: dbProfile?.published || false,
    };
  } catch (error) {
    console.error('Failed to check setup status:', error);
    return {
      success: false,
      error: 'Failed to retrieve setup status',
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
 * Fixes inconsistent metadata state where setup_completed_at exists but some steps are marked as false
 * This can happen if steps were manually marked as complete or if the process was interrupted
 *
 * @returns Object containing success status and the action taken
 */
export async function fixInconsistentMetadata() {
  try {
    console.log('Starting fixInconsistentMetadata function execution');

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

    const metadata = user.unsafeMetadata || {};
    const expertSetup = metadata.expertSetup as Record<string, boolean> | undefined;
    const setupCompletedAt = metadata.setup_completed_at;

    // Initialize Clerk client - we'll need it for any metadata updates
    const clerk = await clerkClient();

    // First check: Always verify Google account status directly from OAuth connections
    const hasGoogleAccountConnection = user.externalAccounts.some(
      (account) => account.provider === 'google',
    );

    // If the user has expertSetup metadata, check if Google account status needs updating
    if (expertSetup) {
      const currentGoogleStatus = expertSetup.google_account || false;

      // Log the current state for debugging
      console.log('Google account connection status check:', {
        hasOAuthConnection: hasGoogleAccountConnection,
        metadataStatus: currentGoogleStatus,
        mismatch: hasGoogleAccountConnection !== currentGoogleStatus,
      });

      // If there's a mismatch, update the metadata
      if (hasGoogleAccountConnection !== currentGoogleStatus) {
        console.log(
          `Fixing Google account connection status: ${currentGoogleStatus} -> ${hasGoogleAccountConnection}`,
        );

        // Update just the expertSetup metadata with the correct Google account status
        const updatedExpertSetup = { ...expertSetup, google_account: hasGoogleAccountConnection };

        // Update the user metadata
        await clerk.users.updateUser(user.id, {
          unsafeMetadata: {
            ...metadata,
            expertSetup: updatedExpertSetup,
          },
        });

        // Revalidate paths that depend on this data
        revalidatePath('/(private)/layout');

        return {
          success: true,
          action: 'fixed-google-account-status',
          message: `Fixed Google account connection status (${hasGoogleAccountConnection ? 'connected' : 'disconnected'})`,
        };
      }
    }

    // Case 1: setup_completed_at exists but some steps are not marked as complete
    if (setupCompletedAt && expertSetup) {
      const allStepsComplete = Object.values(expertSetup).every(Boolean);

      if (!allStepsComplete) {
        // Option 1: If Google account is specifically marked as false,
        // but the user has a Google account connected, correct it
        if (expertSetup.google_account === false) {
          // Check if the user actually has a Google account connected
          const hasGoogleAccount = user.externalAccounts.some(
            (account) => account.provider === 'google',
          );

          if (hasGoogleAccount) {
            console.log('Fixing metadata: User has Google account but it was marked as false');
            // Update just the google_account field
            expertSetup.google_account = true;

            // Update the metadata
            await clerk.users.updateUser(user.id, {
              unsafeMetadata: {
                ...metadata,
                expertSetup,
              },
            });

            revalidatePath('/(private)/layout');
            return {
              success: true,
              action: 'corrected-google-account',
              message: 'Fixed inconsistent Google account metadata',
            };
          }
        }

        // Option 2: If setup_completed_at exists but steps are not complete,
        // remove the completion flags
        console.log('Fixing metadata: setup_completed_at exists but not all steps are complete');

        // Create a new metadata object without the completion flags
        const cleanMetadata: Record<string, unknown> = {};

        // Copy all metadata except the completion flags
        for (const key of Object.keys(metadata)) {
          if (
            key !== 'setup_completed_at' &&
            key !== 'setup_completion_toast_shown' &&
            key !== 'setup_completion_toast_shown_at'
          ) {
            cleanMetadata[key] = metadata[key];
          }
        }

        // Update the metadata
        await clerk.users.updateUser(user.id, {
          unsafeMetadata: cleanMetadata,
        });

        revalidatePath('/(private)/layout');
        return {
          success: true,
          action: 'removed-completion-flags',
          message: 'Removed inconsistent completion flags',
        };
      }
    }

    // Case 2: All steps are complete but setup_completed_at doesn't exist
    if (expertSetup && Object.values(expertSetup).every(Boolean) && !setupCompletedAt) {
      console.log('Fixing metadata: All steps complete but setup_completed_at missing');

      // Add the completion timestamp
      const timestamp = new Date().toISOString();

      // Update the metadata
      await clerk.users.updateUser(user.id, {
        unsafeMetadata: {
          ...metadata,
          setup_completed_at: timestamp,
          setup_completion_toast_shown: true,
          setup_completion_toast_shown_at: timestamp,
        },
      });

      revalidatePath('/(private)/layout');
      return {
        success: true,
        action: 'added-completion-flags',
        message: 'Added missing completion flags',
      };
    }

    // No inconsistency found
    return {
      success: true,
      action: 'no-action-needed',
      message: 'No inconsistency found in metadata',
    };
  } catch (error) {
    console.error('Failed to fix inconsistent metadata:', error);
    return {
      success: false,
      error: 'Failed to fix inconsistent metadata',
    };
  }
}
