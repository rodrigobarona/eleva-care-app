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
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface VerificationState {
  started: boolean;
  expiresAt: number;
}

function setVerificationStarted() {
  const expirationTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const state: VerificationState = {
    started: true,
    expiresAt: expirationTime,
  };
  localStorage.setItem('identityVerificationStarted', JSON.stringify(state));
}

function getVerificationStarted(): boolean {
  try {
    const stored = localStorage.getItem('identityVerificationStarted');
    if (!stored) return false;

    const state = JSON.parse(stored) as VerificationState;
    if (Date.now() > state.expiresAt) {
      // Clear expired state
      localStorage.removeItem('identityVerificationStarted');
      return false;
    }
    return state.started;
  } catch {
    // If there's any error parsing, clear the item and return false
    localStorage.removeItem('identityVerificationStarted');
    return false;
  }
}

export default function IdentityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  // Check verification status on load
  useEffect(() => {
    const checkVerification = async () => {
      // Only check status if verification was started and hasn't expired
      if (!getVerificationStarted()) return;

      try {
        const response = await fetch('/api/stripe/identity/verification/status');
        const data = await response.json();

        if (data.verified) {
          setVerificationStatus('verified');
          toast.success('Identity verified', {
            description: 'Your identity has been successfully verified.',
          });
        } else {
          setVerificationStatus(data.status);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };

    checkVerification();
    // Set up polling if verification is in progress
    const interval = setInterval(checkVerification, 5000);
    return () => clearInterval(interval);
  }, []);

  const startVerification = async () => {
    setLoading(true);
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
