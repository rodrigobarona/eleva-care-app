/**
 * Onboarding Page
 *
 * Smart routing based on user organization type (Airbnb-style pattern):
 * - member_personal → Redirect to /dashboard (fast, frictionless)
 * - expert_individual → Redirect to /setup (guided expert onboarding)
 * - No organization → Auto-create member_personal org and redirect to /dashboard
 *
 * This mirrors Airbnb's approach:
 * - Most users (members) get instant access to the platform
 * - Experts ("hosts") get guided through their setup process
 */
import {
  autoCreateUserOrganization,
  getUserOrganizationType,
} from '@/lib/integrations/workos/auto-organization';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';

export default async function OnboardingPage() {
  // Ensure user is authenticated
  const { user } = await withAuth({ ensureSignedIn: true });

  if (!user) {
    console.log('❌ No user in onboarding - redirecting to login');
    redirect('/login');
  }

  console.log('🎯 Onboarding page accessed');
  console.log('User ID:', user.id);
  console.log('User email:', user.email);

  try {
    // Check user's organization type
    const orgType = await getUserOrganizationType(user.id);
    console.log('🏢 Organization type:', orgType || 'None');

    // If no organization exists, auto-create member_personal (fallback)
    if (!orgType) {
      console.log('🏢 No organization found - auto-creating member organization');
      const result = await autoCreateUserOrganization({
        workosUserId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        orgType: 'member_personal',
      });

      if (result.success) {
        console.log('✅ Fallback member organization created:', result.organizationId);
      } else {
        console.error('❌ Failed to create fallback organization:', result.error);
      }

      redirect('/dashboard');
      return;
    }

    // Route based on organization type
    if (orgType === 'expert_individual') {
      // Expert flow: check if they have an expert role already
      // If not, they need to apply first (the current role won't grant /setup access)
      const { isUserExpert } = await import('@/lib/integrations/workos/roles');
      const hasExpertRole = await isUserExpert(user.id);
      if (hasExpertRole) {
        console.log('🎓 Approved expert - redirecting to setup');
        redirect('/setup');
      } else {
        console.log('📝 Expert org but no role yet - redirecting to apply');
        redirect('/apply');
      }
    } else if (orgType === 'team') {
      // Team flow - guided onboarding
      console.log('🎓 Team user detected - redirecting to setup');
      redirect('/setup');
    } else {
      // Member flow - direct to dashboard
      console.log('👤 Member user detected - redirecting to dashboard');
      redirect('/dashboard');
    }
  } catch (error) {
    console.error('❌ Error in onboarding:', error);
    // Fallback: redirect to dashboard on error
    redirect('/dashboard');
  }

  // Loading state (rarely seen due to redirects)
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Setting up your account...</h1>
        <p className="mt-2 text-gray-600">Please wait</p>
      </div>
    </div>
  );
}
