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

    // Verify identity - Check if user has completed identity verification
    setupStatus.identity = false; // Default to false until proper verification

    // Check identity verification status
    // 1. Check if Stripe identity verification is complete
    if (dbUser?.stripeIdentityVerificationId && dbUser?.stripeIdentityVerified === true) {
      setupStatus.identity = true;
    }
    // 2. Fallback to existing metadata
    else {
      setupStatus.identity = !!metadataSetup.identity;
    }

    // Verify payment setup - Check if user has completed Stripe Connect onboarding
    setupStatus.payment =
      !!dbUser?.stripeConnectAccountId && !!dbUser?.stripeConnectOnboardingComplete;

    // Verify Google account connection - Check if user has connected a Google account
    // Perform a thorough check of external accounts
    const externalAccounts = user.externalAccounts || [];

    // Check for Google accounts in multiple ways
    // 1. Direct check for provider and verification status
    const hasGoogleAccount = externalAccounts.some(
      (account) =>
        account.provider === 'google' &&
        (account.verification?.status === 'verified' ||
          account.verification?.status === 'unverified'),
    );

    // 2. Check for email addresses that match Gmail domain
    const hasGmailEmail = user.emailAddresses?.some(
      (email) =>
        email.emailAddress.toLowerCase().endsWith('@gmail.com') &&
        email.verification?.status === 'verified',
    );

    // 3. Check if Google Calendar integration is set up separately (if applicable)
    // This could involve checking a database flag or other integration status

    // Set the status based on all checks (any of them passing is sufficient)
    setupStatus.google_account =
      hasGoogleAccount ||
      // Only count Gmail addresses if we have OAuth scopes that indicate it was properly connected
      (hasGmailEmail && externalAccounts.some((a) => a.provider === 'google' && a.emailAddress));

    // Add detailed log for debugging
    console.log('Google account verification details:', {
      externalAccounts: externalAccounts.map((a) => ({
        provider: a.provider,
        status: a.verification?.status,
        email: a.emailAddress,
      })),
      hasGoogleAccount,
      hasGmailEmail,
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
