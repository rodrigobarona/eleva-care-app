/**
 * Sign-In Page (AuthKit Next.js)
 *
 * Uses official @workos-inc/authkit-nextjs package for authentication.
 * Generates sign-in URL with redirect support and custom state.
 */
import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';

interface SignInPageProps {
  searchParams: Promise<{ redirect_url?: string }>;
}

/**
 * Sign-In Page
 *
 * Automatically redirects to WorkOS AuthKit sign-in with:
 * - Redirect URL preservation (where user wanted to go)
 * - Custom state for tracking
 */
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const redirectUrl = params.redirect_url || '/dashboard';

  // Generate WorkOS sign-in URL with redirect path
  const signInUrl = await getSignInUrl({
    state: JSON.stringify({
      returnTo: redirectUrl,
    }),
  });

  // Redirect to WorkOS sign-in
  redirect(signInUrl);

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
