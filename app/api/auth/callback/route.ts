/**
 * WorkOS Authentication Callback Handler (AuthKit Next.js)
 *
 * Handles the OAuth callback from WorkOS after user authentication.
 * Uses the official @workos-inc/authkit-nextjs package for automatic session management.
 *
 * Flow:
 * 1. User signs in via WorkOS AuthKit
 * 2. WorkOS redirects here with authorization code
 * 3. handleAuth() exchanges code for tokens and creates encrypted session
 * 4. Custom logic runs in onSuccess callback
 * 5. User synced to database (WorkOS as source of truth)
 * 6. Auto-create personal organization (Airbnb-style pattern)
 * 7. User redirected based on organization type:
 *    - patient_personal → /dashboard (default, fast)
 *    - expert_individual → /onboarding (guided setup)
 *
 * Sync Strategy:
 * - Always sync user data from WorkOS (single source of truth)
 * - Sync profile data (firstName/lastName) immediately
 * - Auto-create organization on first login (org-per-user model)
 * - Detect expert intent from URL state (?expert=true)
 * - Never block authentication on sync failures
 *
 * @see lib/integrations/workos/auto-organization.ts
 */
import { autoCreateUserOrganization } from '@/lib/integrations/workos/auto-organization';
import { syncWorkOSUserToDatabase } from '@/lib/integrations/workos/sync';
import { handleAuth } from '@workos-inc/authkit-nextjs';

export const GET = handleAuth({
  // Default return path - will be overridden by returnTo in state
  returnPathname: '/onboarding',
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  onSuccess: async ({ user, organizationId, authenticationMethod, state }) => {
    console.log('✅ WorkOS authentication successful');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Organization ID:', organizationId || 'None');
    console.log('Authentication Method:', authenticationMethod || 'N/A');

    // Sync user to database (WorkOS as source of truth)
    try {
      const syncResult = await syncWorkOSUserToDatabase({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        profilePictureUrl: user.profilePictureUrl,
      });

      if (!syncResult.success) {
        console.error('⚠️ User sync failed (non-blocking):', syncResult.error);
      } else {
        console.log('✅ User synced successfully');
      }

      // Track authentication method if available
      if (authenticationMethod) {
        console.log(`🔐 User authenticated via: ${authenticationMethod}`);
        // TODO: Track authentication method in analytics
      }

      // Parse custom state for expert intent
      let isExpertRegistration = false;

      if (state) {
        try {
          const stateData = JSON.parse(state);
          console.log('📦 Custom state received:', stateData);

          // Check for expert registration flag (from ?expert=true URL param)
          if (stateData.expert === true || stateData.expert === 'true') {
            isExpertRegistration = true;
            console.log('🎓 Expert registration detected');
          }

          // Log custom redirect path (handled by handleAuth via state.returnTo)
          if (stateData.returnTo) {
            console.log(`🔀 Custom redirect path: ${stateData.returnTo}`);
          }
        } catch {
          // Invalid state JSON - ignore
        }
      }

      // Auto-create personal organization (Airbnb-style pattern)
      // - Default: patient_personal (fast, frictionless)
      // - Expert flow: expert_individual (guided onboarding)
      try {
        console.log('🏢 Auto-creating user organization...');

        const orgResult = await autoCreateUserOrganization({
          workosUserId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          orgType: isExpertRegistration ? 'expert_individual' : 'patient_personal',
        });

        if (orgResult.success) {
          console.log(
            `✅ Organization ${orgResult.isNewOrg ? 'created' : 'exists'}: ${orgResult.organizationId}`,
          );
          console.log(
            `📊 Organization type: ${isExpertRegistration ? 'expert_individual' : 'patient_personal'}`,
          );
        } else {
          console.error('⚠️ Organization creation failed (non-blocking):', orgResult.error);
        }
      } catch (error) {
        console.error('❌ Error creating organization:', error);
        // Don't block authentication if org creation fails
      }
    } catch (error) {
      console.error('❌ Error in onSuccess callback:', error);
      // Don't throw - let authentication succeed even if database operations fail
      // This prevents auth loops if database is temporarily unavailable
    }

    // Note: Custom redirect path is handled by handleAuth via state.returnTo
    // If state.returnTo is present, handleAuth will use it; otherwise, it uses returnPathname
  },

  onError: async ({ error, request }) => {
    console.error('❌ Authentication error:', error);
    console.error('Request URL:', request.url);

    // Log error details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    // Return error response (handleAuth will redirect to sign-in with error)
    return new Response('Authentication failed', { status: 401 });
  },
});
