/**
 * Sign-Up Page (AuthKit Next.js)
 *
 * Uses official @workos-inc/authkit-nextjs package for authentication.
 * Generates sign-up URL with redirect support and custom state.
 */
import { getSignUpUrl } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';

interface SignUpPageProps {
  searchParams: Promise<{ redirect_url?: string }>;
}

/**
 * Sign-Up Page
 *
 * Automatically redirects to WorkOS AuthKit sign-up with:
 * - Redirect URL preservation (where user wanted to go)
 * - Custom state for tracking
 */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const redirectUrl = params.redirect_url || '/dashboard';

  // Generate WorkOS sign-up URL with redirect path
  const signUpUrl = await getSignUpUrl({
    state: JSON.stringify({
      returnTo: redirectUrl,
    }),
  });

  // Redirect to WorkOS sign-up
  redirect(signUpUrl);

  // This return is never reached due to redirect, but required for TypeScript
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Redirecting to sign up...</h1>
        <p className="mt-2 text-gray-600">Please wait</p>
      </div>
    </div>
  );
}
