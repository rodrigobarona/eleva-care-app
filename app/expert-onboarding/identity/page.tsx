'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { useExpertOnboarding } from '@/components/molecules/ExpertOnboardingProvider';
import { OnboardingStepNav, StepNavigationButtons } from '@/components/molecules/OnboardingStepNav';
import { AlertCircle, CheckCircle, ExternalLink, Loader2, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface VerificationStatus {
  isVerified: boolean;
  isPending: boolean;
  verificationUrl?: string;
}

export default function IdentityStepPage() {
  const { markStepComplete, refreshStatus } = useExpertOnboarding();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    isVerified: false,
    isPending: false,
  });

  // Fetch verification status
  useEffect(() => {
    const fetchVerificationStatus = async () => {
      try {
        const response = await fetch('/api/identity/status');
        if (response.ok) {
          const data = await response.json();
          setVerificationStatus({
            isVerified: data.isVerified,
            isPending: data.isPending,
            verificationUrl: data.verificationUrl,
          });
        }
      } catch (error) {
        console.error('Failed to fetch verification status:', error);
        toast.error('Failed to check your verification status.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVerificationStatus();
  }, []);

  const handleStartVerification = () => {
    if (verificationStatus.verificationUrl) {
      window.location.href = verificationStatus.verificationUrl;
    }
  };

  const handleContinue = async () => {
    try {
      setIsSubmitting(true);
      await markStepComplete('identity');
      await refreshStatus();

      // This is the final step, so redirect to main onboarding page
      router.push('/expert-onboarding');

      toast.success('Congratulations! You have completed all onboarding steps.');
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
      await markStepComplete('identity');
      await refreshStatus();

      // This is the final step, so redirect to main onboarding page
      router.push('/expert-onboarding');
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
      <OnboardingStepNav currentStep="identity" />

      <Card>
        <CardHeader>
          <CardTitle>Verify Your Identity</CardTitle>
          <CardDescription>
            Complete identity verification to build trust with clients and ensure platform safety.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {verificationStatus.isVerified ? (
            <div className="rounded-md bg-primary/10 p-4">
              <div className="flex">
                <div className="shrink-0">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-primary">Identity Verified</h3>
                  <div className="mt-2 text-sm text-primary/80">
                    <p>Great! Your identity has been successfully verified.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : verificationStatus.isPending ? (
            <div className="rounded-md bg-amber-50 p-4">
              <div className="flex">
                <div className="shrink-0">
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">Verification in Progress</h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>
                      Your identity verification is currently being processed. This usually takes
                      24-48 hours. We&apos;ll notify you once it&apos;s complete.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md bg-muted p-6 text-center">
              <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-lg font-medium">Verify Your Identity</h3>
              <p className="mb-6 text-muted-foreground">
                As an expert on our platform, we require identity verification to ensure trust and
                safety for all users. This process is secure and confidential.
              </p>

              <Button onClick={handleStartVerification} className="mb-2">
                Start Verification
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground">
                You&apos;ll be redirected to our secure verification partner
              </p>
            </div>
          )}

          <div className="rounded-md bg-muted p-4">
            <h4 className="mb-2 font-medium">What you&apos;ll need:</h4>
            <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
              <li>A valid government-issued photo ID (passport, driver&apos;s license, etc.)</li>
              <li>A device with a camera for a quick selfie verification</li>
              <li>A few minutes to complete the process</li>
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              Your personal information is encrypted and securely stored in compliance with GDPR and
              data protection regulations.
            </p>
          </div>

          <StepNavigationButtons
            onContinue={handleContinue}
            onSkip={handleSkip}
            continueBtnText={isSubmitting ? 'Saving...' : 'Continue'}
            continueBtnDisabled={isSubmitting && !verificationStatus.isVerified}
            showSkip={!verificationStatus.isVerified}
            skipBtnText="Skip for now"
          />
        </CardContent>
      </Card>
    </>
  );
}
