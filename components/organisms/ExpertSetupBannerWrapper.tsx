import { ExpertSetupBanner } from '@/components/organisms/ExpertSetupBanner';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function ExpertSetupBannerWrapper() {
  const { userId } = await auth();

  // If user is not authenticated, don't show anything
  if (!userId) return null;

  // Get current user to check role
  const user = await currentUser();
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
