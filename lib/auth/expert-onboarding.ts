import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

// Define the onboarding steps
export const EXPERT_ONBOARDING_STEPS = [
  'username', // Set username
  'events', // Create at least one event type
  'schedule', // Set up availability
  'profile', // Complete expert profile
  'billing', // Connect Stripe account
  'identity', // Verify identity
] as const;

export type OnboardingStep = (typeof EXPERT_ONBOARDING_STEPS)[number];

// Define the onboarding status object type
export interface ExpertOnboardingStatus {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  isComplete: boolean;
  profilePublished: boolean;
}

// Get the onboarding status for a user
export async function getExpertOnboardingStatus(
  clerkUserId: string,
): Promise<ExpertOnboardingStatus> {
  try {
    // Fetch user data from database
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, clerkUserId),
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Parse the onboarding data from JSON or use default
    const onboardingData = user.expertOnboardingStatus
      ? JSON.parse(user.expertOnboardingStatus as string)
      : {
          currentStep: 'username',
          completedSteps: [],
          isComplete: false,
          profilePublished: false,
        };

    return onboardingData;
  } catch (error) {
    console.error('Error fetching expert onboarding status:', error);
    // Return default onboarding status if there's an error
    return {
      currentStep: 'username',
      completedSteps: [],
      isComplete: false,
      profilePublished: false,
    };
  }
}

// Update the onboarding status for a user
export async function updateExpertOnboardingStatus(
  clerkUserId: string,
  updates: Partial<ExpertOnboardingStatus>,
): Promise<ExpertOnboardingStatus> {
  try {
    // Get current status
    const currentStatus = await getExpertOnboardingStatus(clerkUserId);

    // Merge updates with current status
    const updatedStatus = {
      ...currentStatus,
      ...updates,
    };

    // Save to database
    await db
      .update(UserTable)
      .set({
        expertOnboardingStatus: JSON.stringify(updatedStatus),
        updatedAt: new Date(),
      })
      .where(eq(UserTable.clerkUserId, clerkUserId));

    return updatedStatus;
  } catch (error) {
    console.error('Error updating expert onboarding status:', error);
    throw error;
  }
}

// Mark a step as completed
export async function completeOnboardingStep(
  clerkUserId: string,
  step: OnboardingStep,
): Promise<ExpertOnboardingStatus> {
  const currentStatus = await getExpertOnboardingStatus(clerkUserId);

  // Add to completed steps if not already there
  const completedSteps = currentStatus.completedSteps.includes(step)
    ? currentStatus.completedSteps
    : [...currentStatus.completedSteps, step];

  // Find the next incomplete step
  const nextIncompleteStep =
    EXPERT_ONBOARDING_STEPS.find((s) => !completedSteps.includes(s)) || currentStatus.currentStep;

  // Check if all steps are complete
  const isComplete = completedSteps.length === EXPERT_ONBOARDING_STEPS.length;

  // Update the status
  return updateExpertOnboardingStatus(clerkUserId, {
    completedSteps,
    currentStep: nextIncompleteStep,
    isComplete,
  });
}

// Check if a user has completed expert onboarding
export async function hasCompletedExpertOnboarding(clerkUserId: string): Promise<boolean> {
  const status = await getExpertOnboardingStatus(clerkUserId);
  return status.isComplete;
}

// Get the next incomplete step for a user
export async function getNextOnboardingStep(clerkUserId: string): Promise<OnboardingStep> {
  const status = await getExpertOnboardingStatus(clerkUserId);
  return status.currentStep;
}

// Publish expert profile
export async function publishExpertProfile(clerkUserId: string): Promise<ExpertOnboardingStatus> {
  const status = await getExpertOnboardingStatus(clerkUserId);

  if (!status.isComplete) {
    throw new Error('Cannot publish profile until all onboarding steps are complete');
  }

  return updateExpertOnboardingStatus(clerkUserId, {
    profilePublished: true,
  });
}

// Check if a user's expert profile is published
export async function isExpertProfilePublished(clerkUserId: string): Promise<boolean> {
  const status = await getExpertOnboardingStatus(clerkUserId);
  return status.profilePublished;
}
