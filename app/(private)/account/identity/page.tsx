'use client';

import { Button } from '@/components/atoms/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/atoms/card';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// Constants for polling configuration
const INITIAL_POLL_INTERVAL = Number(
  process.env.NEXT_PUBLIC_VERIFICATION_INITIAL_POLL_INTERVAL || '5000',
); // 5 seconds
const MAX_POLL_INTERVAL = Number(process.env.NEXT_PUBLIC_VERIFICATION_MAX_POLL_INTERVAL || '30000'); // 30 seconds
const BACKOFF_FACTOR = Number(process.env.NEXT_PUBLIC_VERIFICATION_BACKOFF_FACTOR || '1.5');
const MAX_POLL_ATTEMPTS = Number(process.env.NEXT_PUBLIC_VERIFICATION_MAX_POLL_ATTEMPTS || '30'); // Stop polling after ~5 minutes with backoff

type VerificationStatus =
  | 'not_started'
  | 'requires_input'
  | 'processing'
  | 'verified'
  | 'canceled'
  | 'failed';

interface VerificationData {
  expiresAt: string;
  startedAt: string;
}

function getVerificationStarted(): VerificationData | null {
  const data = localStorage.getItem('verification_started');
  if (!data) return null;

  try {
    const parsed = JSON.parse(data);
    // Validate that the parsed data has the expected properties
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'expiresAt' in parsed &&
      'startedAt' in parsed
    ) {
      return parsed as VerificationData;
    }
    return null;
  } catch {
    return null;
  }
}

function setVerificationStarted() {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minute expiration

  const verificationData: VerificationData = {
    startedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  localStorage.setItem('verification_started', JSON.stringify(verificationData));
}

export default function IdentityPage() {
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('not_started');
  const [loading, setLoading] = useState(true); // Start with loading state
  const pollAttempts = useRef(0);
  const currentInterval = useRef(INITIAL_POLL_INTERVAL);

  // Check verification status from database on initial load
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const response = await fetch('/api/stripe/identity/verification/status');
        const data = await response.json();

        if (data.verified) {
          setVerificationStatus('verified');
          // Clear any stale local storage data
          localStorage.removeItem('verification_started');
          localStorage.removeItem('verification_timestamp');

          // If verified, maybe redirect to connect/billing
          const searchParams = new URLSearchParams(window.location.search);
          if (searchParams.has('redirectTo')) {
            const redirectTo = searchParams.get('redirectTo') || '';
            // List of recognized redirect targets
            const validRedirects = ['billing', 'connect', 'setup'];

            if (validRedirects.includes(redirectTo)) {
              // Handle recognized redirect targets
              const redirectUrl =
                redirectTo === 'billing' || redirectTo === 'connect'
                  ? '/account/billing'
                  : redirectTo === 'setup'
                    ? '/setup'
                    : '/account/billing'; // Fallback if somehow a valid value doesn't match

              toast.success('Identity already verified', {
                description: 'You are being redirected to continue your setup.',
              });
              // Short delay before redirect
              setTimeout(() => {
                window.location.href = redirectUrl;
              }, 1500);
            } else {
              // Log warning for unrecognized redirection value
              console.warn(`Unrecognized redirectTo parameter: ${redirectTo}`);

              // Still show a success message without redirect
              toast.success('Identity verification complete', {
                description: 'Your identity has been successfully verified.',
              });

              // Optional: redirect to a default location after warning
              // This ensures users aren't stuck even with invalid parameters
              setTimeout(() => {
                window.location.href = '/account/billing'; // Default fallback
              }, 1500);
            }
          }
        } else if (data.status) {
          setVerificationStatus(data.status);
          // If verification is in progress, setup polling
          if (
            data.status !== 'canceled' &&
            data.status !== 'failed' &&
            data.status !== 'not_started'
          ) {
            setVerificationStarted();
          }
        }
      } catch (error) {
        console.error('Error checking initial verification status:', error);
        // Fall back to local storage check for offline usage
        if (getVerificationStarted()) {
          setVerificationStatus('processing');
        }
      } finally {
        setLoading(false);
      }
    };

    checkInitialStatus();
  }, []);

  // Check verification status with polling if verification was started
  useEffect(() => {
    // Only start polling if verification is in progress
    if (!getVerificationStarted() || verificationStatus === 'verified') return;

    const checkVerification = async () => {
      // Only check status if verification was started and hasn't expired
      if (!getVerificationStarted()) return false;

      try {
        const response = await fetch('/api/stripe/identity/verification/status');
        const data = await response.json();

        // Handle terminal states
        if (data.verified || data.status === 'canceled' || data.status === 'failed') {
          // Clear verification data from localStorage
          localStorage.removeItem('verification_started');
          localStorage.removeItem('verification_timestamp');

          if (data.verified) {
            setVerificationStatus('verified');
            toast.success('Identity verified', {
              description: 'Your identity has been successfully verified.',
            });
          } else {
            setVerificationStatus(data.status);
            toast.error('Verification unsuccessful', {
              description:
                data.status === 'canceled'
                  ? 'Identity verification was canceled.'
                  : 'Identity verification failed. Please try again.',
            });
          }
          return true; // Signal completion for any terminal state
        }

        setVerificationStatus(data.status);
        return false; // Continue polling for non-terminal states
      } catch (error) {
        console.error('Error checking verification status:', error);
        return false;
      }
    };

    const pollWithBackoff = () => {
      if (pollAttempts.current >= MAX_POLL_ATTEMPTS) {
        console.log('Max polling attempts reached, stopping polls');
        // Clear stale verification data if max attempts reached
        localStorage.removeItem('verification_started');
        localStorage.removeItem('verification_timestamp');
        return;
      }

      pollAttempts.current++;
      currentInterval.current = Math.min(
        currentInterval.current * BACKOFF_FACTOR,
        MAX_POLL_INTERVAL,
      );

      checkVerification().then((isComplete) => {
        if (!isComplete) {
          setTimeout(pollWithBackoff, currentInterval.current);
        }
      });
    };

    // Initial check
    checkVerification().then((isComplete) => {
      if (!isComplete) {
        setTimeout(pollWithBackoff, INITIAL_POLL_INTERVAL);
      }
    });

    return () => {
      pollAttempts.current = MAX_POLL_ATTEMPTS; // Stop polling on unmount
    };
  }, [verificationStatus]);

  const startVerification = async () => {
    setLoading(true);

    // Check if there's an ongoing verification
    const verificationData = getVerificationStarted();
    if (verificationData) {
      const now = Date.now();
      const expiresAt = new Date(verificationData.expiresAt).getTime();

      if (now < expiresAt) {
        const minutesRemaining = Math.ceil((expiresAt - now) / (1000 * 60));
        toast.error('Verification in progress', {
          description: `You have an ongoing verification session. Please wait ${minutesRemaining} minutes before starting a new one.`,
        });
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/stripe/identity/verification', {
        method: 'POST',
      });

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        // Handle HTTP error responses
        const errorText = await response.text();
        let errorMessage = `Error: ${response.status} ${response.statusText}`;

        try {
          // Try to parse as JSON if possible
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;

          // Special handling for rate limiting (429)
          if (response.status === 429 && errorData.cooldownRemaining) {
            errorMessage = `Too many verification attempts. Please try again in ${errorData.cooldownRemaining} seconds.`;
          }

          // Special handling for other common error codes
          if (response.status === 403) {
            errorMessage =
              'You do not have permission to start verification. Please contact support.';
          } else if (response.status === 500) {
            errorMessage =
              'Server error. Please try again later or contact support if the issue persists.';
          } else if (response.status === 503) {
            errorMessage = 'Verification service unavailable. Please try again later.';
          }
        } catch {
          // If not JSON, use the raw text
          if (errorText) errorMessage += ` - ${errorText}`;
        }

        toast.error('Verification Error', {
          description: errorMessage,
        });
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.redirectUrl) {
        // Reset polling state for new verification
        pollAttempts.current = 0;
        currentInterval.current = INITIAL_POLL_INTERVAL;

        // Track that verification was started with expiration
        setVerificationStarted();

        // Redirect to Stripe's verification flow
        window.location.href = data.redirectUrl;
      } else if (data.success && data.status === 'verified') {
        setVerificationStatus('verified');
        toast.success('Already verified', {
          description: 'Your identity has already been verified.',
        });
      } else {
        toast.error('Error', {
          description: data.error || 'Failed to start verification process',
        });
      }
    } catch (error) {
      console.error('Error starting identity verification:', error);
      toast.error('Error', {
        description:
          error instanceof Error
            ? error.message
            : error instanceof TypeError && error.message.includes('fetch')
              ? 'Network error. Please check your internet connection and try again.'
              : 'An error occurred while starting the verification process',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <h1 className="mb-6 text-3xl font-bold">Identity Verification</h1>

      <Card>
        <CardHeader>
          <CardTitle>Verify Your Identity</CardTitle>
          <CardDescription>
            We need to verify your identity to comply with financial regulations and protect our
            platform from fraud.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span className="ml-3">Checking verification status...</span>
            </div>
          ) : (
            <>
              <p className="mb-4">
                The verification process takes just a few minutes. You&apos;ll need to provide:
              </p>
              <ul className="mb-4 list-disc pl-5">
                <li>
                  A valid government-issued photo ID (passport, driver&apos;s license, or ID card)
                </li>
                <li>A live photo of yourself for facial recognition</li>
              </ul>

              {verificationStatus === 'verified' ? (
                <div className="rounded-md bg-green-50 p-4 text-green-800">
                  <p className="font-medium">Your identity has been successfully verified!</p>
                  <p className="mt-2">You can now proceed to set up your payment account.</p>
                </div>
              ) : (
                <div className="rounded-md bg-blue-50 p-4 text-blue-800">
                  <p className="font-medium">
                    {verificationStatus === 'requires_input'
                      ? 'Your verification needs additional information.'
                      : 'Please complete the identity verification process to continue.'}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
        <CardFooter>
          {loading ? (
            <Button disabled>Loading...</Button>
          ) : verificationStatus === 'verified' ? (
            <Button onClick={() => router.push('/account/billing')}>
              Continue to Payment Setup
            </Button>
          ) : (
            <Button onClick={startVerification} disabled={loading}>
              {loading ? 'Starting Verification...' : 'Start Verification Process'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
