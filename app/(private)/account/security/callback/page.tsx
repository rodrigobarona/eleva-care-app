'use client';

import { handleGoogleAccountConnection } from '@/server/actions/expert-setup';
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function GoogleCallbackPage() {
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    // Handle post-OAuth updates without interfering with Clerk's redirect
    const handlePostOAuth = async () => {
      try {
        // Wait a moment for the OAuth callback to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Update the Google account status
        const result = await handleGoogleAccountConnection();
        if (result.success) {
          console.log('✅ Google account connection status updated');
          // Don't show toast here as we're about to redirect
        } else {
          console.warn('⚠️ Could not update Google account status:', result.error);
        }
      } catch (error) {
        console.error('❌ Error in post-OAuth handling:', error);
      } finally {
        setIsProcessing(false);

        // Clean up session storage
        sessionStorage.removeItem('is_expert_oauth_flow');
        sessionStorage.removeItem('oauth_return_url');
        sessionStorage.removeItem('oauth_code_verifier');
      }
    };

    // Run post-OAuth handling after a short delay
    const timer = setTimeout(handlePostOAuth, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Use Clerk's built-in callback handler with proper redirect URLs
  // The key is to use afterSignInUrl to override the fallback redirect
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
        <h2 className="text-lg font-medium">
          {isProcessing ? 'Completing Google account connection...' : 'Finalizing connection...'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isProcessing
            ? 'Please wait while we finalize your connection.'
            : 'Redirecting you back to security settings...'}
        </p>

        {/* 
          Core 2 AuthenticateWithRedirectCallback with proper redirect handling.
          Use afterSignInUrl to ensure we return to the security page after OAuth.
          This overrides the fallback redirect URLs.
        */}
        <AuthenticateWithRedirectCallback
          afterSignInUrl="/account/security?oauth_success=true"
          afterSignUpUrl="/account/security?oauth_success=true"
          signInFallbackRedirectUrl="/account/security?oauth_success=true"
          signUpFallbackRedirectUrl="/account/security?oauth_success=true"
        />
      </div>
    </div>
  );
}
