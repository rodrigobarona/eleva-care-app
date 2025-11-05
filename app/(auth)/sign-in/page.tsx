/**
 * Sign-In Page
 *
 * WorkOS AuthKit sign-in flow.
 * Redirects to WorkOS hosted sign-in page.
 * Respects redirect_url query parameter for post-login navigation.
 */
import { workos, WORKOS_CLIENT_ID } from '@/lib/integrations/workos/client';
import { redirect } from 'next/navigation';

interface SignInPageProps {
  searchParams: Promise<{ redirect_url?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const redirectUrl = params.redirect_url || '/dashboard';

  // Generate WorkOS authorization URL with return path
  const authUrl = await workos.userManagement.getAuthorizationUrl({
    provider: 'authkit',
    clientId: WORKOS_CLIENT_ID,
    redirectUri: process.env.WORKOS_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
    state: JSON.stringify({ returnTo: redirectUrl }),
  });

  // Redirect to WorkOS sign-in
  redirect(authUrl);

  // This return is never reached due to redirect, but required for TypeScript
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Redirecting to sign in...</h1>
        <p className="mt-2 text-gray-600">Please wait</p>
      </div>
    </div>
  );
}
