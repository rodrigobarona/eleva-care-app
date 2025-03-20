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
const INITIAL_POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLL_INTERVAL = 30000; // 30 seconds
const BACKOFF_FACTOR = 1.5;
const MAX_POLL_ATTEMPTS = 30; // Stop polling after ~5 minutes with backoff

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
    return JSON.parse(data);
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
  const [loading, setLoading] = useState(false);
  const pollAttempts = useRef(0);
  const currentInterval = useRef(INITIAL_POLL_INTERVAL);

  // Check verification status on load
  useEffect(() => {
    const checkVerification = async () => {
      // Only check status if verification was started and hasn't expired
      if (!getVerificationStarted()) return false;

      try {
        const response = await fetch('/api/stripe/identity/verification/status');
        const data = await response.json();

        if (data.verified) {
          setVerificationStatus('verified');
          toast.success('Identity verified', {
            description: 'Your identity has been successfully verified.',
          });
          return true; // Signal completion
        }

        setVerificationStatus(data.status);
        return false; // Continue polling
      } catch (error) {
        console.error('Error checking verification status:', error);
        return false;
      }
    };

    const pollWithBackoff = () => {
      if (pollAttempts.current >= MAX_POLL_ATTEMPTS) {
        console.log('Max polling attempts reached, stopping polls');
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
  }, []);

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
        </CardContent>
        <CardFooter>
          {verificationStatus === 'verified' ? (
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
