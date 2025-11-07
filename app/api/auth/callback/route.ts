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
 * 6. User redirected to returnPathname (from state or default: /dashboard)
 *
 * Sync Strategy:
 * - Always sync user data from WorkOS (single source of truth)
 * - Sync profile data (firstName/lastName) immediately
 * - Create personal organization on first login
 * - Never block authentication on sync failures
 */
import { syncWorkOSUserToDatabase } from '@/lib/integrations/workos/sync';
import { handleAuth } from '@workos-inc/authkit-nextjs';

export const GET = handleAuth({
  returnPathname: '/dashboard',
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

      // Handle custom state for redirect
      if (state) {
        try {
          const stateData = JSON.parse(state);
          console.log('📦 Custom state received:', stateData);

          if (stateData.returnTo) {
            console.log(`🔀 Will redirect to: ${stateData.returnTo}`);
          }
        } catch {
          // Invalid state JSON - ignore
        }
      }

      // TODO: Create personal organization on first login
      // This will be handled in Phase 5 when we implement org sync
    } catch (error) {
      console.error('❌ Error in onSuccess callback:', error);
      // Don't throw - let authentication succeed even if database operations fail
      // This prevents auth loops if database is temporarily unavailable
    }
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
