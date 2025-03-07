'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function GoogleCallbackPage() {
  const { handleRedirectCallback } = useClerk();
  const router = useRouter();
  const [status, setStatus] = useState('Processing your authentication...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get the current URL to pass to handleRedirectCallback
    const currentUrl = window.location.href;

    async function processOAuthVerification() {
      try {
        // Handle the OAuth verification callback
        // This completes the connection process
        await handleRedirectCallback({
          redirectUrl: currentUrl,
        });

        setStatus('Successfully connected your Google account!');

        // Redirect back to the security page after a short delay
        setTimeout(() => {
          router.push('/account/security');
        }, 1500);
      } catch (err) {
        console.error('Error handling OAuth verification:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect your Google account');

        // Still redirect back after a delay
        setTimeout(() => {
          router.push('/account/security');
        }, 3000);
      }
    }

    processOAuthVerification();
  }, [handleRedirectCallback, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        {error ? (
          <div className="rounded border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive">
            <h2 className="mb-2 text-xl font-bold">Connection Error</h2>
            <p>{error}</p>
            <p className="mt-4 text-sm">Redirecting you back...</p>
          </div>
        ) : (
          <div className="rounded-lg bg-card p-6 shadow-lg">
            <div className="mb-4 flex justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{status}</h2>
          </div>
        )}
      </div>
    </div>
  );
}
