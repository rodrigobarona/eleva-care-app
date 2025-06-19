'use server';

import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { fixInconsistentMetadata } from './fixes';

/**
 * Represents the different steps in the expert setup process.
 * Each step must be completed for an expert to have full platform access.
 */
export type ExpertSetupStep =
  | 'profile' // Basic profile information completion
  | 'availability' // Setting up available time slots for consultations
  | 'events' // Configuring event types and pricing
  | 'identity' // Stripe identity verification for compliance
  | 'payment' // Stripe Connect account setup for receiving payments
  | 'google_account'; // Google account connection for calendar integration

/**
 * Generic action result type for consistent return patterns across all server actions.
 * @template T - The type of data returned on success
 */
type ActionResult<T = void> = {
  success: boolean; // Indicates if the operation was successful
  error?: string; // Error message if operation failed
  data?: T; // Optional data payload on success
};

/**
 * Helper function to determine if a user has any expert role.
 * Supports both single role and multiple roles in publicMetadata.
 *
 * @param user - User object with publicMetadata containing role information
 * @returns true if user has 'community_expert' or 'top_expert' role, false otherwise
 *
 * @example
 * ```typescript
 * const user = { publicMetadata: { role: 'community_expert' } };
 * const isExpert = hasExpertRole(user); // returns true
 * ```
 */
function hasExpertRole(user: { publicMetadata?: Record<string, unknown> }): boolean {
  // Handle both single role (string) and multiple roles (array) formats
  const roles = Array.isArray(user.publicMetadata?.role)
    ? (user.publicMetadata.role as string[])
    : [user.publicMetadata?.role as string];

  // Check if any role matches expert roles
  return roles.some((role: string) => role === 'community_expert' || role === 'top_expert');
}

/**
 * Validates if all required setup steps have been completed.
 * This determines if an expert can be marked as having completed setup.
 *
 * @param setupStatus - Object mapping setup step names to completion status
 * @returns true if all required steps are marked as completed (true), false otherwise
 *
 * @example
 * ```typescript
 * const status = { profile: true, availability: true, events: false };
 * const isComplete = areAllStepsCompleted(status); // returns false
 * ```
 */
function areAllStepsCompleted(setupStatus: Record<string, boolean>): boolean {
  // Define all steps that must be completed for full expert setup
  const requiredSteps: ExpertSetupStep[] = [
    'profile',
    'availability',
    'events',
    'identity',
    'payment',
    'google_account',
  ];

  // Verify every required step is marked as completed
  return requiredSteps.every((step) => setupStatus[step] === true);
}

/**
 * Updates the master setupComplete flag in the user's Clerk metadata.
 * This flag is used to quickly determine if an expert has completed all setup steps
 * without having to check individual step statuses.
 *
 * @param userId - The Clerk user ID to update
 * @param setupStatus - Current setup status object with individual step completions
 * @returns Promise<void> - No return value, logs success/failure
 *
 * @example
 * ```typescript
 * await updateSetupCompleteFlag('user_123', { profile: true, availability: true });
 * ```
 */
async function updateSetupCompleteFlag(userId: string, setupStatus: Record<string, boolean>) {
  try {
    // Initialize Clerk client for user management operations
    const clerk = await clerkClient();

    // Fetch current user data to compare existing setupComplete flag
    const user = await clerk.users.getUser(userId);

    if (!user) {
      console.error('User not found when updating setup complete flag');
      return;
    }

    // Calculate if setup should be marked as complete based on all steps
    const isComplete = areAllStepsCompleted(setupStatus);

    // Only perform update if the flag value actually needs to change (optimization)
    if (user.unsafeMetadata?.setupComplete !== isComplete) {
      await clerk.users.updateUser(userId, {
        unsafeMetadata: {
          ...user.unsafeMetadata,
          setupComplete: isComplete,
        },
      });

      console.log(`Updated setupComplete flag to ${isComplete} for user ${userId}`);
    }
  } catch (error) {
    console.error('Failed to update setup complete flag:', error);
  }
}

/**
 * Marks a specific setup step as complete WITHOUT triggering UI revalidation.
 * This version is safe to use during server component rendering where revalidation
 * would cause hydration issues.
 *
 * @param step - The specific setup step to mark as complete
 * @returns Promise<ActionResult> with success status and updated setup status
 *
 * @example
 * ```typescript
 * const result = await markStepCompleteNoRevalidate('profile');
 * if (result.success) {
 *   console.log('Profile step completed:', result.setupStatus);
 * }
 * ```
 */
export async function markStepCompleteNoRevalidate(step: ExpertSetupStep) {
  try {
    // Verify user authentication and get current user data
    const user = await currentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Ensure user has appropriate expert role before allowing setup modifications
    const isExpert = hasExpertRole(user);
    if (!isExpert) {
      return { success: false, error: 'User is not an expert' };
    }

    // Get existing setup status from user metadata
    const currentSetup = (user.unsafeMetadata?.expertSetup as Record<string, boolean>) || {};

    // Skip update if step is already marked complete (idempotent operation)
    if (currentSetup[step]) {
      return {
        success: true,
        setupStatus: currentSetup,
      };
    }

    // Create updated setup object with the new step marked complete
    const updatedSetup = {
      ...currentSetup,
      [step]: true,
    };

    // Persist changes to Clerk user metadata
    const clerk = await clerkClient();
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
 * Marks a specific setup step as complete WITH UI revalidation.
 * This version should NOT be used during server component rendering.
 * Use this for user-initiated actions that need immediate UI updates.
 *
 * @param step - The specific setup step to mark as complete
 * @returns Promise<ActionResult> with success status and updated setup status
 *
 * @example
 * ```typescript
 * // In a form submission handler
 * const result = await markStepComplete('availability');
 * if (result.success) {
 *   // UI will automatically update due to revalidation
 * }
 * ```
 */
export async function markStepComplete(step: ExpertSetupStep) {
  // First mark the step complete without revalidation
  const result = await markStepCompleteNoRevalidate(step);

  // Only proceed with side effects if the core operation succeeded
  if (result.success) {
    // Update the master setupComplete flag if we have the setup status
    if (result.setupStatus) {
      const user = await currentUser();
      if (user) {
        await updateSetupCompleteFlag(user.id, result.setupStatus);
      }
    }

    // Trigger UI revalidation to reflect changes immediately
    revalidatePath('/(private)/layout');
  }

  return result;
}

/**
 * Comprehensive check of the current expert setup status with automatic fixes.
 * Validates setup completion status and fixes any inconsistencies in metadata.
 * This is typically called when loading setup-related pages.
 *
 * @returns Promise<ActionResult> with detailed setup status information
 *
 * @example
 * ```typescript
 * const status = await checkExpertSetupStatus();
 * if (status.success) {
 *   console.log('Setup complete:', status.isSetupComplete);
 *   console.log('Profile published:', status.isPublished);
 * }
 * ```
 */
export async function checkExpertSetupStatus() {
  try {
    // Verify user authentication
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Extract setup status and publishing status from metadata
    const setupStatus = user.unsafeMetadata?.expertSetup || {};
    const isPublished = user.unsafeMetadata?.profile_published || false;

    // Check for inconsistencies between setupComplete flag and actual step completion
    const isSetupComplete = user.unsafeMetadata?.setupComplete === true;
    const allStepsComplete = areAllStepsCompleted(setupStatus as Record<string, boolean>);

    // Fix inconsistency if setupComplete flag doesn't match actual completion status
    if (isSetupComplete !== allStepsComplete) {
      await updateSetupCompleteFlag(user.id, setupStatus as Record<string, boolean>);
    }

    // Run automated fixes for any other metadata inconsistencies
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
 * Marks a setup step as complete for a specific user ID (typically used in webhooks).
 * This version doesn't use currentUser() since it's designed for server-side operations
 * where user authentication context may not be available.
 *
 * @param step - The setup step to mark as complete
 * @param userId - The Clerk user ID to update (obtained from webhook payload)
 * @returns Promise<ActionResult> with success status and updated setup status
 *
 * @example
 * ```typescript
 * // In a Stripe webhook handler
 * await markStepCompleteForUser('payment', webhookUserId);
 * ```
 */
export async function markStepCompleteForUser(step: ExpertSetupStep, userId: string) {
  try {
    // Use Clerk client to fetch user by ID (doesn't require auth context)
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify user has expert role before allowing setup modifications
    const isExpert = hasExpertRole(user);
    if (!isExpert) {
      return { success: false, error: 'User is not an expert' };
    }

    // Get current setup status from user metadata
    const currentSetup = (user.unsafeMetadata?.expertSetup as Record<string, boolean>) || {};

    // Skip if step is already complete (idempotent operation)
    if (currentSetup[step]) {
      return {
        success: true,
        setupStatus: currentSetup,
      };
    }

    // Create updated setup status with new step marked complete
    const updatedSetup = {
      ...currentSetup,
      [step]: true,
    };

    // Persist changes to user metadata
    await clerk.users.updateUser(user.id, {
      unsafeMetadata: {
        ...user.unsafeMetadata,
        expertSetup: updatedSetup,
      },
    });

    // Update master setupComplete flag if all steps are now done
    await updateSetupCompleteFlag(userId, updatedSetup);

    // Trigger UI revalidation for when user next visits the app
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
 * Updates the completion status of a single setup step (can mark as complete or incomplete).
 * This provides more granular control than the other functions which only mark steps complete.
 *
 * @param stepId - The ID of the setup step to update
 * @param completed - Whether the step should be marked as completed (true) or incomplete (false)
 * @returns Promise<ActionResult> with success status and step details
 *
 * @example
 * ```typescript
 * // Mark a step as incomplete for re-completion
 * await updateSetupStepStatus('identity', false);
 *
 * // Mark a step as complete
 * await updateSetupStepStatus('profile', true);
 * ```
 */
export async function updateSetupStepStatus(stepId: string, completed: boolean) {
  try {
    // Verify user authentication
    const user = await currentUser();
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Create a mutable copy of current metadata
    const currentMetadata = { ...user.unsafeMetadata };

    // Initialize expertSetup object if it doesn't exist
    if (!currentMetadata.expertSetup) {
      currentMetadata.expertSetup = {};
    }

    // Update the specific step's completion status
    const expertSetup = currentMetadata.expertSetup as Record<string, boolean>;
    expertSetup[stepId] = completed;

    // Persist changes to Clerk
    const clerk = await clerkClient();
    await clerk.users.updateUser(user.id, {
      unsafeMetadata: currentMetadata,
    });

    // Trigger UI revalidation for immediate feedback
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
 * Validates the setup sequence to ensure proper order of operations.
 * Specifically ensures Identity verification happens before Stripe Connect setup
 * since Connect requires verified identity for compliance.
 *
 * @returns Promise<ActionResult> with detailed sequence validation and next step guidance
 *
 * @example
 * ```typescript
 * const sequence = await checkSetupSequence();
 * if (sequence.success && sequence.nextStep === 'identity') {
 *   // Redirect user to identity verification
 * }
 * ```
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

    // Verify user has expert role
    const isExpert = hasExpertRole(user);
    if (!isExpert) {
      return {
        success: false,
        error: 'User is not an expert',
      };
    }

    // Get detailed user info from database for Stripe integration status
    const dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, user.id),
    });

    if (!dbUser) {
      return {
        success: false,
        error: 'User not found in database',
      };
    }

    // Extract current setup status from metadata
    const setupStatus = (user.unsafeMetadata?.expertSetup as Record<string, boolean>) || {};

    // Check Stripe Identity verification status (required for compliance)
    const identityVerified = dbUser.stripeIdentityVerified;

    // Check Stripe Connect account status (required for payments)
    const connectAccountId = dbUser.stripeConnectAccountId;
    const connectDetailsSubmitted = dbUser.stripeConnectDetailsSubmitted;

    // Determine the next required step based on current status
    let nextStep = null;
    if (!identityVerified) {
      nextStep = 'identity'; // Identity verification must come first
    } else if (!connectAccountId || !connectDetailsSubmitted) {
      nextStep = 'connect'; // Connect setup after identity is verified
    }

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
      nextStep,
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
 * Handles the Google account connection step of expert setup.
 * Verifies that the user has at least one verified Google account connected
 * and marks the google_account setup step as complete if so.
 *
 * This is typically called after a successful Google OAuth flow to automatically
 * progress the expert through the setup process.
 *
 * @returns Promise<ActionResult<boolean>> - Success result with data indicating if step was completed
 *
 * @example
 * ```typescript
 * // After Google OAuth callback
 * const result = await handleGoogleAccountConnection();
 * if (result.success && result.data) {
 *   console.log('Google account step automatically completed');
 * }
 * ```
 */
export async function handleGoogleAccountConnection(): Promise<ActionResult<boolean>> {
  try {
    // Get authenticated user ID from auth context
    const { userId } = await auth();
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Fetch full user details including external account connections
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);

    console.log(`🔍 Checking Google account connection for user ${userId}`);

    // Verify user has expert role before updating expert setup
    const isExpert = hasExpertRole(user);
    if (!isExpert) {
      console.log(`ℹ️ User ${userId} is not an expert, skipping expert setup metadata update`);
      return {
        success: false,
        error: 'User is not an expert',
      };
    }

    // Find all Google external accounts connected to this user
    const googleAccounts = user.externalAccounts.filter((account) => account.provider === 'google');

    console.log(
      `🔍 Found ${googleAccounts.length} Google account(s):`,
      googleAccounts.map((acc) => ({
        id: acc.id,
        email: acc.emailAddress,
        verified: acc.verification?.status === 'verified',
      })),
    );

    // Verify at least one Google account is fully verified
    const hasVerifiedGoogleAccount = googleAccounts.some(
      (account) => account.verification?.status === 'verified',
    );

    if (!hasVerifiedGoogleAccount) {
      return {
        success: false,
        error: 'No verified Google account found',
      };
    }

    // Update expert setup metadata to mark Google account step as complete
    const currentMetadata = user.unsafeMetadata as {
      expertSetup?: Record<ExpertSetupStep, boolean>;
    };

    const expertSetup = {
      ...(currentMetadata?.expertSetup || {}),
      google_account: true,
    };

    // Persist the updated setup status
    await clerk.users.updateUser(userId, {
      unsafeMetadata: {
        ...currentMetadata,
        expertSetup,
      },
    });

    console.log(`✅ Updated Google account connection status for expert user ${userId}`);
    console.log(`📊 Expert setup status:`, expertSetup);

    // Update master setupComplete flag if all steps are now done
    await updateSetupCompleteFlag(userId, expertSetup);

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
