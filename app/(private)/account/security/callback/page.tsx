'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function GoogleCallbackPage() {
  const { handleRedirectCallback } = useClerk();
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [status, setStatus] = useState('Processing your authentication...');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return; // Wait until user data is loaded

    // Get the current URL to pass to handleRedirectCallback
    const currentUrl = window.location.href;
    console.log('Processing OAuth callback at URL:', currentUrl);

    async function processOAuthVerification() {
      try {
        // Handle the OAuth verification callback
        // This completes the connection process
        console.log('Starting handleRedirectCallback with URL:', currentUrl);
        const result = await handleRedirectCallback({
          redirectUrl: currentUrl,
        });

        console.log('OAuth verification result:', result);

        // Check if the user now has the Google account connected
        if (user) {
          console.log('User external accounts:', user.externalAccounts);
          const googleConnected = user.externalAccounts.some(
            (account) =>
              account.provider === 'google' && account.verification?.status === 'verified',
          );

          if (googleConnected) {
            setStatus('Successfully connected your Google account!');
          } else {
            setStatus('OAuth verification completed, but Google account not connected yet.');
            setDebugInfo('User may need to refresh the page to see the connection.');
          }
        }

        // Refresh the page after a short delay to show the new connection
        setTimeout(() => {
          // Use replace instead of push to refresh the page
          window.location.replace('/account/security');
        }, 2000);
      } catch (err) {
        console.error('Error handling OAuth verification:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect your Google account');
        setDebugInfo(JSON.stringify(err, null, 2));

        // Still redirect back after a delay
        setTimeout(() => {
          router.push('/account/security');
        }, 3000);
      }
    }

    processOAuthVerification();
  }, [handleRedirectCallback, router, isLoaded, user]);

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
          </div>
        )}
      </div>
    </div>
  );
}
