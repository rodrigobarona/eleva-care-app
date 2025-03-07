'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function GoogleCallbackPage() {
  const { handleRedirectCallback } = useClerk();
  const router = useRouter();
  const [status, setStatus] = useState('Processing your request...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function processCallback() {
      try {
        // Handle the OAuth callback
        await handleRedirectCallback({
          redirectUrl: window.location.href,
        });

        // Show success message
        setStatus('Google account connected successfully!');

        // Redirect back to the security page after a short delay
        setTimeout(() => {
          router.push('/account/security');
        }, 2000);
      } catch (err) {
        console.error('Error handling OAuth callback:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect your Google account');
        // Still redirect back after a delay
        setTimeout(() => {
          router.push('/account/security');
        }, 3000);
      }
    }

    processCallback();
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
