import { ExpertSetupBanner } from '@/components/features/expert-setup/ExpertSetupBanner';
import { withAuth } from '@workos-inc/authkit-nextjs';

export async function ExpertSetupBannerWrapper() {
  const { user } = await withAuth();

  // If user is not authenticated, don't show anything
  if (!user) return null;

  // Get current user to check role
  const { user } = await withAuth();
  if (!user) return null;

  // Check if user has an expert role
  const userRoles = user.publicMetadata?.role;
  let hasExpertRole = false;

  if (Array.isArray(userRoles)) {
    hasExpertRole = userRoles.some((role) => role === 'community_expert' || role === 'top_expert');
  } else if (typeof userRoles === 'string') {
    hasExpertRole = userRoles === 'community_expert' || userRoles === 'top_expert';
  }

  // Only show banner to users with expert roles
  if (!hasExpertRole) return null;

  return <ExpertSetupBanner />;
}
