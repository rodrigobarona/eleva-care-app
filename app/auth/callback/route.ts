/**
 * WorkOS Authentication Callback Handler
 *
 * Handles the OAuth callback from WorkOS after user authentication.
 * Exchanges authorization code for tokens and creates session.
 *
 * Flow:
 * 1. User signs in via WorkOS AuthKit
 * 2. WorkOS redirects here with authorization code
 * 3. Exchange code for access/refresh tokens
 * 4. Create session cookie with JWT
 * 5. Redirect to app (dashboard or returnTo URL)
 */
import { setSession } from '@/lib/auth/workos-session';
import { workos } from '@/lib/integrations/workos/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  console.log('🔐 Auth callback hit:', req.nextUrl.toString());

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  console.log('Code:', code ? 'Present' : 'Missing');
  console.log('State:', state || 'None');

  if (!code) {
    console.error('❌ No code provided in callback');
    return NextResponse.redirect(new URL('/sign-in?error=no_code', req.url));
  }

  try {
    console.log('🔄 Exchanging code with WorkOS...');

    // Exchange authorization code for tokens
    const { user, organizationId, accessToken, refreshToken } =
      await workos.userManagement.authenticateWithCode({
        code,
        clientId: process.env.WORKOS_CLIENT_ID!,
      });

    console.log('✅ WorkOS authentication successful');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Organization ID:', organizationId || 'None');

    // Get or create organization for user (org-per-user model)
    if (!organizationId) {
      // User doesn't have an org yet - this shouldn't happen in prod
      // but handle gracefully in development
      console.warn('⚠️  User authenticated without organization - redirecting to onboarding');

      // TODO: Call createUserOrganization() from onboarding actions
      // For now, redirect to onboarding
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }

    // TODO: Get user's role in organization from database
    // For now, default to 'owner' since it's their personal org
    const role = 'owner';

    console.log('💾 Creating session...');

    // Create session
    await setSession({
      userId: user.id,
      email: user.email,
      organizationId,
      role,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 3600000, // 1 hour
    });

    console.log('✅ Session created');

    // Parse return URL from state
    let returnTo = '/dashboard';
    if (state) {
      try {
        const stateData = JSON.parse(state);
        returnTo = stateData.returnTo || returnTo;
      } catch {
        // Invalid state, use default
      }
    }

    console.log('🚀 Redirecting to:', returnTo);
    return NextResponse.redirect(new URL(returnTo, req.url));
  } catch (error) {
    console.error('❌ Authentication error:', error);

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return NextResponse.redirect(new URL('/sign-in?error=authentication_failed', req.url));
  }
}
