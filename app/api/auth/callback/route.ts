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
 * 5. User redirected to returnPathname (default: /dashboard)
 */
import { db } from '@/drizzle/db';
import { UserOrgMembershipsTable, UsersTable } from '@/drizzle/schema-workos';
import { handleAuth } from '@workos-inc/authkit-nextjs';
import { eq } from 'drizzle-orm';

export const GET = handleAuth({
  returnPathname: '/dashboard',
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  onSuccess: async ({ user, organizationId, authenticationMethod, state }) => {
    console.log('✅ WorkOS authentication successful');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Organization ID:', organizationId || 'None');
    console.log('Authentication Method:', authenticationMethod || 'N/A');

    // Ensure user exists in database
    try {
      const existingUser = await db.query.UsersTable.findFirst({
        where: eq(UsersTable.workosUserId, user.id),
      });

      if (!existingUser) {
        console.log('📝 Creating new user in database');
        await db.insert(UsersTable).values({
          workosUserId: user.id,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        });
      } else {
        console.log('👤 Existing user found');
      }

      // Track authentication method if available (only on initial login)
      if (authenticationMethod) {
        console.log(`🔐 User authenticated via: ${authenticationMethod}`);
        // TODO: Track authentication method in analytics
      }

      // Handle custom state if passed
      if (state) {
        console.log('📦 Custom state received:', state);
        // TODO: Process custom state (e.g., team invites, feature flags)
      }
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
