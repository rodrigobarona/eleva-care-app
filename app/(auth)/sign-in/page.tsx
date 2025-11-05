/**
 * Sign-In Page
 *
 * WorkOS AuthKit sign-in flow.
 * Redirects to WorkOS hosted sign-in page.
 */
import { workos, WORKOS_CLIENT_ID } from '@/lib/integrations/workos/client';
import { redirect } from 'next/navigation';

/**
 * Handle sign-in action
 *
 * Generates WorkOS authorization URL and redirects user.
 */
async function handleSignIn() {
  'use server';

  // Generate WorkOS authorization URL
  const authUrl = await workos.userManagement.getAuthorizationUrl({
    provider: 'authkit',
    clientId: WORKOS_CLIENT_ID,
    redirectUri: process.env.WORKOS_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    state: JSON.stringify({ returnTo: '/dashboard' }),
  });

  redirect(authUrl);
}

export default async function SignInPage() {
  // Automatically redirect to WorkOS sign-in
  await handleSignIn();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Redirecting to sign in...</h1>
        <p className="mt-2 text-gray-600">Please wait</p>
      </div>
    </div>
  );
}
