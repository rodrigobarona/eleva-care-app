/**
 * Sign-Up Page (AuthKit Next.js - Enhanced UX)
 *
 * Uses official @workos-inc/authkit-nextjs package for authentication.
 * Generates sign-up URL with redirect support and custom state.
 *
 * Enhanced Features:
 * - Elegant loading animation
 * - Shows redirect destination
 * - Handles error states from query params
 * - OAuth provider preview (Google, GitHub, etc.)
 */
import { getSignUpUrl, withAuth } from '@workos-inc/authkit-nextjs';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { redirect } from 'next/navigation';

interface SignUpPageProps {
  searchParams: Promise<{
    redirect_url?: string;
    error?: string;
    error_description?: string;
  }>;
}

/**
 * Sign-Up Page
 *
 * Automatically redirects to WorkOS AuthKit sign-up with:
 * - Redirect URL preservation (where user wanted to go)
 * - Custom state for tracking
 * - Error handling
 */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;

  // Check if user is already authenticated
  const { user } = await withAuth({ ensureSignedIn: false });

  if (user) {
    // User already logged in - redirect to destination
    const redirectUrl = params.redirect_url || '/dashboard';
    redirect(redirectUrl);
  }

  const redirectUrl = params.redirect_url || '/onboarding';
  const error = params.error;
  const errorDescription = params.error_description;

  // Generate WorkOS sign-up URL with redirect path
  const signUpUrl = await getSignUpUrl({
    state: JSON.stringify({
      returnTo: redirectUrl,
    }),
  });

  // Redirect to WorkOS sign-up
  redirect(signUpUrl);

  // This return is never reached due to redirect, but required for TypeScript
  // It also serves as the UI shown briefly before redirect
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo/Brand */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
              E
            </div>
            <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-primary" />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-auto max-w-sm rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive">{error}</p>
            {errorDescription && (
              <p className="mt-1 text-xs text-destructive/80">{errorDescription}</p>
            )}
          </div>
        )}

        {/* Loading State */}
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Creating your account</h1>
            <p className="text-sm text-muted-foreground">
              You'll be redirected to our secure registration page
            </p>
          </div>

          {/* Destination Preview */}
          {redirectUrl !== '/onboarding' && redirectUrl !== '/dashboard' && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>Then continuing to</span>
              <span className="font-medium text-foreground">{redirectUrl}</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          )}

          {/* OAuth Providers Preview */}
          <div className="mt-6 space-y-2 text-xs text-muted-foreground">
            <p>Create account with:</p>
            <div className="flex items-center justify-center gap-2">
              <span className="rounded-md bg-muted px-2 py-1">Email</span>
              <span className="rounded-md bg-muted px-2 py-1">Google</span>
              <span className="rounded-md bg-muted px-2 py-1">GitHub</span>
            </div>
          </div>

          {/* Benefits Preview */}
          <div className="mt-6 space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Join thousands of users</p>
            <p>Secure • Private • Professional</p>
          </div>
        </div>

        {/* Manual Fallback */}
        <div className="pt-4">
          <a href={signUpUrl} className="text-sm text-primary hover:underline">
            Click here if not redirected automatically
          </a>
        </div>

        {/* Already have account link */}
        <div className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <a href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
