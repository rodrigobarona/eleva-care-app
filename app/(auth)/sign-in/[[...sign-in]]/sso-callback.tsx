import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * SSO Callback handler component
 *
 * This component integrates with Clerk's authentication flow to handle SSO callbacks.
 * Enhanced with debug logging and manual redirection to ensure proper flow.
 */
export default function SSOCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Log when component mounts to help debug
    console.log('SSO Callback mounted, handling authentication redirect');

    // Get redirect_url from query parameters if present
    const redirectUrl = searchParams.get('redirect_url');
    console.log('Redirect URL from query params:', redirectUrl);

    // Function to handle post-authentication redirection
    const handleRedirect = () => {
      console.log('Authentication completed, handling redirection');

      // Check if we have a redirect URL from query params
      if (redirectUrl) {
        console.log('Redirecting to URL from query params:', redirectUrl);
        router.push(redirectUrl);
        return;
      }

      // If no redirect URL in query params, go to dashboard
      console.log('No redirect URL in query params, going to dashboard');

      // Small delay to ensure Clerk has processed authentication
      setTimeout(() => {
        console.log('Redirecting to dashboard');
        router.push('/dashboard');
      }, 500);
    };

    // Listen for Clerk's authentication completion
    window.addEventListener('clerk.user.loaded', handleRedirect);

    // Also set a fallback timer in case the event doesn't fire
    const fallbackTimer = setTimeout(() => {
      console.log('Fallback timer triggered, checking if we need to redirect');
      if (document.cookie.includes('__client')) {
        console.log('Clerk cookie found, seems authenticated, redirecting to dashboard');
        router.push('/dashboard');
      }
    }, 2000);

    return () => {
      window.removeEventListener('clerk.user.loaded', handleRedirect);
      clearTimeout(fallbackTimer);
    };
  }, [router, searchParams]);

  // Use Clerk's component to handle the authentication portion
  return (
    <>
      <AuthenticateWithRedirectCallback />
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
          <p>Completing authentication...</p>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;ll be redirected to your dashboard in a moment.
          </p>
        </div>
      </div>
    </>
  );
}
