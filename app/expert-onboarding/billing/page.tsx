'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { useExpertOnboarding } from '@/components/molecules/ExpertOnboardingProvider';
import { OnboardingStepNav, StepNavigationButtons } from '@/components/molecules/OnboardingStepNav';
import { AlertCircle, CheckCircle, CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface StripeStatus {
  isConnected: boolean;
  accountLink?: string;
  isComplete?: boolean;
  pendingRequirements?: string[];
}

export default function BillingStepPage() {
  const { markStepComplete, refreshStatus } = useExpertOnboarding();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus>({
    isConnected: false,
  });

  // Handle stripe status error
  const handleStripeError = useCallback((error: unknown) => {
    console.error('Failed to fetch Stripe status:', error);
    toast.error('Failed to check your payment account status.');
  }, []);

  // Fetch Stripe connection status
  useEffect(() => {
    const fetchStripeStatus = async () => {
      try {
        const response = await fetch('/api/stripe/connect/status');
        if (response.ok) {
          const data = await response.json();
          setStripeStatus({
            isConnected: data.isConnected,
            accountLink: data.accountLink,
            isComplete: data.isComplete,
            pendingRequirements: data.pendingRequirements || [],
          });
        }
      } catch (error) {
        handleStripeError(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStripeStatus();
  }, [handleStripeError]);

  const handleConnectStripe = () => {
    if (stripeStatus.accountLink) {
      window.location.href = stripeStatus.accountLink;
    }
  };

  const handleContinue = async () => {
    try {
      setIsSubmitting(true);
      await markStepComplete('billing');
      await refreshStatus();
      router.push('/expert-onboarding/identity');
    } catch (error) {
      console.error('Failed to complete step:', error);
      toast.error('Failed to save your progress. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      setIsSubmitting(true);
      await markStepComplete('billing');
      await refreshStatus();
      router.push('/expert-onboarding/identity');
    } catch (error) {
      console.error('Failed to skip step:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <OnboardingStepNav currentStep="billing" />

      <Card>
        <CardHeader>
          <CardTitle>Connect Payment Account</CardTitle>
          <CardDescription>
            Set up your Stripe account to receive payments from clients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!stripeStatus.isConnected ? (
            <div className="rounded-md bg-muted p-6 text-center">
              <CreditCard className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-lg font-medium">Connect Stripe to Receive Payments</h3>
              <p className="mb-6 text-muted-foreground">
                You&apos;ll need to connect a Stripe account to receive payments from your clients.
                This only takes a few minutes.
              </p>

              <Button onClick={handleConnectStripe} className="mb-2">
                Connect Stripe Account
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground">
                You&apos;ll be redirected to Stripe to complete the setup process
              </p>
            </div>
          ) : !stripeStatus.isComplete ? (
            <div className="rounded-md bg-amber-50 p-4">
              <div className="flex">
                <div className="shrink-0">
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Your Stripe account needs attention
                  </h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>Please complete the following requirements in your Stripe account:</p>
                    <ul className="mt-1 list-inside list-disc">
                      {stripeStatus.pendingRequirements?.map((req) => <li key={req}>{req}</li>)}
                    </ul>
                  </div>
                  <div className="mt-4">
                    <Button onClick={handleConnectStripe} variant="outline" size="sm">
                      Complete Stripe Setup
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md bg-primary/10 p-4">
              <div className="flex">
                <div className="shrink-0">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-primary">
                    Your Stripe account is connected
                  </h3>
                  <div className="mt-2 text-sm text-primary/80">
                    <p>Great! Your Stripe account is fully set up and ready to receive payments.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Eleva takes a 5% service fee on all payments to cover platform
              costs. Stripe will also charge their standard processing fee (typically 2.9% + 30¢).
            </p>
          </div>

          <StepNavigationButtons
            onContinue={handleContinue}
            onSkip={handleSkip}
            continueBtnText={isSubmitting ? 'Saving...' : 'Continue'}
            continueBtnDisabled={isSubmitting}
            showSkip={!stripeStatus.isComplete}
            skipBtnText="Skip for now"
          />
        </CardContent>
      </Card>
    </>
  );
}
