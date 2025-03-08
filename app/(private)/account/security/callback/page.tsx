'use client';

import { checkExpertSetupStatus } from '@/server/actions/expert-setup';
import { useClerk, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function GoogleCallbackPage() {
  const clerk = useClerk();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [status, setStatus] = useState('Processing your authentication...');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Simulate progress updates for better UX
  useEffect(() => {
    if (!error) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + 5;
          if (newProgress >= 90) {
            clearInterval(interval);
            return 90; // Max progress before completion
          }
          return newProgress;
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [error]);

  useEffect(() => {
    if (!isLoaded) return; // Wait until user data is loaded

    // Get the current URL for the callback
    const currentUrl = window.location.href;

    async function processCallback() {
      try {
        // Use the available callback handler method
        if (clerk && typeof clerk.handleRedirectCallback === 'function') {
          // Immediate feedback that we're handling the redirect
          setStatus('Verifying Google authorization...');
          setProgress(30);

          await clerk.handleRedirectCallback({
            redirectUrl: currentUrl,
          });

          setStatus('Authentication successful, checking connection...');
          setProgress(60);

          // Check if the Google account was connected
          if (user) {
            const googleAccount = user.externalAccounts.find(
              (account) => account.provider === 'google',
            );

            if (googleAccount) {
              setStatus('Successfully connected your Google account!');
              setProgress(80);

              // Ensure the Google account email is added to the user's email addresses if not already there
              if (
                googleAccount.emailAddress &&
                !user.emailAddresses.some(
                  (email) => email.emailAddress === googleAccount.emailAddress,
                )
              ) {
                try {
                  setStatus('Adding Google email to your profile...');
                  // Add the email to the user's account
                  await user.createEmailAddress({
                    email: googleAccount.emailAddress,
                  });
                  setStatus('Google email added to your profile!');
                } catch (emailError) {
                  console.error('Error adding Google email to profile:', emailError);
                  setDebugInfo(
                    `Failed to add Google email: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`,
                  );
                }
              }

              try {
                // Always update the expert setup status regardless of expert role
                // This ensures the Google account connection is properly reflected
                await checkExpertSetupStatus();

                // Create and dispatch a custom event with detailed data
                if (typeof window !== 'undefined') {
                  // Standard event for basic refresh
                  window.dispatchEvent(new Event('expert-setup-updated'));

                  // Enhanced event with additional data if needed
                  const detailedEvent = new CustomEvent('google-account-connected', {
                    detail: {
                      timestamp: new Date().toISOString(),
                      accountEmail: googleAccount.emailAddress || 'unknown',
                      isExpert: sessionStorage.getItem('is_expert_oauth_flow') === 'true',
                    },
                  });
                  window.dispatchEvent(detailedEvent);
                }

                setProgress(100);
                setDebugInfo('Google account connected and setup status updated');
              } catch (setupError) {
                console.error('Error updating expert setup status:', setupError);
                setDebugInfo(
                  `Failed to update expert setup status: ${setupError instanceof Error ? setupError.message : 'Unknown error'}`,
                );
                setProgress(90);
              }

              // Clean up session storage
              sessionStorage.removeItem('is_expert_oauth_flow');

              // Show success toast that will appear after redirect
              setTimeout(() => {
                toast.success('Google account connected successfully');
              }, 1000);
            } else {
              setStatus('Verification completed, but Google account not yet visible.');
              setDebugInfo('The account connection may take a moment to appear.');
              setProgress(90);
            }
          }

          // Get the return URL from session storage or default to security page
          const returnUrl = sessionStorage.getItem('oauth_return_url') || '/account/security';
          sessionStorage.removeItem('oauth_return_url'); // Clear after use

          // Redirect back after a short delay
          setTimeout(() => {
            router.push(returnUrl);
          }, 2000);
        } else {
          throw new Error('No redirect callback handler available');
        }
      } catch (err) {
        console.error('Error handling OAuth callback:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect your Google account');
        setProgress(100); // Complete the progress bar

        // Clean up session storage
        sessionStorage.removeItem('is_expert_oauth_flow');
        sessionStorage.removeItem('oauth_return_url');

        // Show error toast that will appear after redirect
        setTimeout(() => {
          toast.error('Failed to connect Google account');
        }, 1000);

        // Still redirect back to security page after a delay
        setTimeout(() => {
          const returnUrl = sessionStorage.getItem('oauth_return_url') || '/account/security';
          router.push(returnUrl);
        }, 3000);
      }
    }

    processCallback();
  }, [clerk, router, isLoaded, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        {error ? (
          <div className="rounded border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive">
            <h2 className="mb-2 text-xl font-bold">Connection Error</h2>
            <p>{error}</p>
            {debugInfo && (
              <div className="mt-2 overflow-auto rounded bg-muted/50 p-2 text-left text-xs">
                <pre>{debugInfo}</pre>
              </div>
            )}
            <p className="mt-4 text-sm">Redirecting you back...</p>
          </div>
        ) : (
          <div className="rounded-lg bg-card p-6 shadow-lg">
            <div className="mb-4 flex justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{status}</h2>
            {debugInfo && <p className="mt-2 text-sm text-muted-foreground">{debugInfo}</p>}

            {/* Progress bar */}
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
