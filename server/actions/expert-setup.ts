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
      .then((result) => result[0]?.count || 0);
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

    // Verify Google account connection - Enhanced with multiple verification methods
    console.log('External accounts:', user.externalAccounts);

    // Method 1: Check for Google external account
    const externalAccounts = user.externalAccounts || [];
    const hasGoogleExternalAccount = externalAccounts.some(
      (account) =>
        account.provider === 'google' &&
        (account.verification?.status === 'verified' ||
          account.verification?.status === 'unverified'),
    );

    // Method 2: Check if any email addresses match the Gmail domain and are verified
    const emailAddresses = user.emailAddresses || [];
    const hasVerifiedGmailAddress = emailAddresses.some(
      (email) =>
        email.emailAddress.endsWith('@gmail.com') && email.verification?.status === 'verified',
    );

    // Method 3: Check if Google Calendar integration is set up (if applicable)
    // This is a placeholder - implement based on your specific integration logic
    const hasGoogleCalendarIntegration = !!metadataSetup.google_account;

    // Set the status for Google account connection - any method is sufficient
    setupStatus.google_account =
      hasGoogleExternalAccount || hasVerifiedGmailAddress || hasGoogleCalendarIntegration;

    // Detailed logging for debugging purposes
    console.log('Google account verification:', {
      hasGoogleExternalAccount,
      hasVerifiedGmailAddress,
      hasGoogleCalendarIntegration,
      result: setupStatus.google_account,
    });

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
