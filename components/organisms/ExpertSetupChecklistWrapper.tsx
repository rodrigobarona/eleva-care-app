import { ExpertSetupChecklist } from '@/components/organisms/ExpertSetupChecklist';
import { EXPERT_ROLES } from '@/lib/constants/roles';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function ExpertSetupChecklistWrapper() {
  const { userId } = await auth();

  // If user is not authenticated, don't show anything
  if (!userId) return null;

  // Get current user to check role
  const user = await currentUser();
  if (!user) return null;

  // Check if user has an expert role using array method only
  const userRoles = user.publicMetadata?.role;
  let hasExpertRole = false;

  if (Array.isArray(userRoles)) {
    // Check if any of the user's roles match the expert roles
    hasExpertRole = userRoles.some((role) =>
      EXPERT_ROLES.includes(String(role) as (typeof EXPERT_ROLES)[number]),
    );
  }

  // Only show checklist to users with expert roles
  if (!hasExpertRole) return null;

  // Check if setup is already completed
  const expertSetup = user.unsafeMetadata?.expertSetup as Record<string, boolean> | undefined;
  const setupCompletedAt = user.unsafeMetadata?.setup_completed_at;

  // Don't show checklist if either:
  // 1. The setup_completed_at timestamp exists (explicit completion)
  if (setupCompletedAt) {
    return null;
  }

  // 2. All steps in expertSetup are true (implicit completion)
  if (expertSetup) {
    const allStepsCompleted = Object.values(expertSetup).every((value) => value === true);
    if (allStepsCompleted) {
      return null;
    }
  }

  // Check for inconsistent metadata state - if google_account is false but setup_completed_at exists
  if (expertSetup && setupCompletedAt) {
    const googleAccountMissing = expertSetup.google_account === false;
    // Only show if Google account is specifically missing, otherwise hide
    if (!googleAccountMissing) {
      return null;
    }
  }

  // Only render the checklist if setup is not completed
  return <ExpertSetupChecklist />;
}
