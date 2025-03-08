'use client';

import { checkExpertSetupStatus } from '@/server/actions/expert-setup';
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
              account.provider === 'google' &&
              (account.verification?.status === 'verified' ||
                account.verification?.status === 'unverified'),
          );

          if (googleConnected) {
            setStatus('Successfully connected your Google account!');

            // Check if user is an expert (from session storage or metadata)
            const isExpertFromStorage = sessionStorage.getItem('is_expert_oauth_flow');
            const isExpertFromMeta =
              user.publicMetadata?.role &&
              (Array.isArray(user.publicMetadata.role)
                ? user.publicMetadata.role.some((role) =>
                    ['community_expert', 'top_expert'].includes(String(role)),
                  )
                : ['community_expert', 'top_expert'].includes(String(user.publicMetadata.role)));

            if (isExpertFromStorage === 'true' || isExpertFromMeta) {
              try {
                // Refresh expert setup status
                await checkExpertSetupStatus();

                // Dispatch a custom event to trigger checklist refresh
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new Event('expert-setup-updated'));
                }

                setDebugInfo('Expert setup status updated successfully');
              } catch (setupError) {
                console.error('Error updating expert setup status:', setupError);
                setDebugInfo(
                  'Failed to update expert setup status. Expert checklist may need manual refresh.',
                );
              }
            }

            // Clean up session storage
            sessionStorage.removeItem('is_expert_oauth_flow');
          } else {
            setStatus('OAuth verification completed, but Google account not connected yet.');
            setDebugInfo('User may need to refresh the page to see the connection.');
          }
        }

        // Refresh the page after a short delay to show the new connection
        setTimeout(() => {
          // Use push instead of replace to ensure event listeners are preserved
          router.push('/account/security');
        }, 2000);
      } catch (err) {
        console.error('Error handling OAuth verification:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect your Google account');
        setDebugInfo(JSON.stringify(err, null, 2));

        // Clean up session storage
        sessionStorage.removeItem('is_expert_oauth_flow');

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
