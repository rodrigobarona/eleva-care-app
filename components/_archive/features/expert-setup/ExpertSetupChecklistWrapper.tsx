import { ExpertSetupChecklist } from '@/components/features/expert-setup/ExpertSetupChecklist';
import { withAuth } from '@workos-inc/authkit-nextjs';

export async function ExpertSetupChecklistWrapper() {
  const { user } = await withAuth();

  // If user is not authenticated, don't show anything
  if (!user) return null;

  // Get current user to check role
  const { user } = await withAuth();
  if (!user) return null;

  // Check if user has an expert role by checking the array of roles
  // Support both array of roles and legacy string format
  const userRoles = user.publicMetadata?.role;
  let hasExpertRole = false;

  if (Array.isArray(userRoles)) {
    // New format: role is an array of strings
    hasExpertRole = userRoles.some((role) => role === 'community_expert' || role === 'top_expert');
  } else if (typeof userRoles === 'string') {
    // Legacy format: role is a single string
    hasExpertRole = userRoles === 'community_expert' || userRoles === 'top_expert';
  }

  // Only show checklist to users with expert roles
  if (!hasExpertRole) return null;

  return <ExpertSetupChecklist />;
}
