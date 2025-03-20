'use client';

import { Button } from '@/components/atoms/button';
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function IdentityCallbackPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('Checking verification status...');
  const [showRetryButton, setShowRetryButton] = useState(false);

  const checkVerificationStatus = useCallback(async () => {
    setIsLoading(true);
    setShowRetryButton(false);
    setMessage('Checking verification status...');

    try {
      const response = await fetch('/api/stripe/identity/verification/status');
      const data = await response.json();

      if (data.success) {
        setMessage('Verification successful!');
        // Use replace to prevent going back to callback page
        setTimeout(() => {
          router.replace('/account/identity/success');
        }, 3000);
      } else if (data.status === 'requires_input') {
        setMessage('Additional verification required');
        // Use replace to force user back to identity page
        setTimeout(() => {
          router.replace('/account/identity');
        }, 3000);
      } else {
        // For other statuses, show retry option
        setMessage(
          'Failed to check verification status. Please try again or contact support if this continues.',
        );
        setShowRetryButton(true);
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      setMessage(
        'Failed to check verification status. Please try again or contact support if this continues.',
      );
      setShowRetryButton(true);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkVerificationStatus();
  }, [checkVerificationStatus]);

  return (
    <div className="container flex h-[50vh] flex-col items-center justify-center">
      {isLoading && <LoadingSpinner />}
      <h1 className="mb-2 text-xl font-semibold">{message}</h1>
      {showRetryButton ? (
        <div className="mt-4 flex flex-col items-center gap-2">
          <Button onClick={checkVerificationStatus}>Retry Verification Check</Button>
          <Button
            variant="outline"
            onClick={() => router.replace('/account/identity')}
            className="mt-2"
          >
            Back to Identity Verification
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground">
          {!showRetryButton && 'You will be redirected shortly...'}
        </p>
      )}
    </div>
  );
}
