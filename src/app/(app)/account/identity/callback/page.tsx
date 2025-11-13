'use client';

import { LoadingSpinner } from '@/components/shared/loading/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function IdentityVerificationCallback() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Checking verification status...');
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [retryDisabled, setRetryDisabled] = useState(false);

  const checkVerificationStatus = useCallback(async () => {
    setIsLoading(true);
    setShowRetryButton(false);
    setRetryDisabled(true);
    setMessage('Checking verification status...');

    try {
      const response = await fetch('/api/stripe/identity/status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check verification status');
      }

      switch (data.status) {
        case 'verified':
          setMessage('Identity verification successful!');
          router.replace('/account/identity/success');
          break;
        case 'requires_input':
          setMessage('Additional information required.');
          router.replace('/account/identity');
          break;
        case 'processing':
          setMessage('Verification is still processing...');
          setShowRetryButton(true);
          break;
        case 'unverified':
          setMessage('Verification failed. Please try again.');
          router.replace('/account/identity');
          break;
        default:
          setMessage('Unknown verification status.');
          setShowRetryButton(true);
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      setMessage('Failed to check verification status.');
      setShowRetryButton(true);
    } finally {
      setIsLoading(false);
      // Enable retry after 2 seconds
      setTimeout(() => setRetryDisabled(false), 2000);
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
          <Button onClick={checkVerificationStatus} disabled={retryDisabled}>
            {retryDisabled ? 'Please wait...' : 'Retry Verification Check'}
          </Button>
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
