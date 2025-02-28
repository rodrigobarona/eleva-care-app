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
import { useExpertOnboarding } from '@/components/molecules/ExpertOnboardingProvider';
import { EXPERT_ONBOARDING_STEPS, type OnboardingStep } from '@/lib/auth/expert-onboarding';
import { AlertCircle, ArrowRight, CheckCircle, Circle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ExpertOnboardingPage() {
  const router = useRouter();
  const {
    currentStep,
    isComplete,
    profilePublished,
    isLoading,
    goToStep,
    publishProfile,
    getStepStatus,
  } = useExpertOnboarding();

  // Redirect to current step if not on the main page
  useEffect(() => {
    if (!isLoading && currentStep) {
      router.push(`/expert-onboarding/${currentStep}`);
    }
  }, [isLoading, currentStep, router]);

  if (isLoading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading your onboarding status...</p>
        </div>
      </div>
    );
  }

  const stepLabels: Record<OnboardingStep, string> = {
    username: 'Choose Username',
    events: 'Create Event Types',
    schedule: 'Set Your Schedule',
    profile: 'Complete Profile',
    billing: 'Connect Payment',
    identity: 'Verify Identity',
  };

  const stepDescriptions: Record<OnboardingStep, string> = {
    username: 'Set your unique username for your booking page URL',
    events: 'Create at least one event type that clients can book',
    schedule: 'Define your availability for bookings',
    profile: 'Complete your expert profile with bio and specialties',
    billing: 'Connect Stripe for receiving payments',
    identity: 'Verify your identity for platform trust',
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Your Onboarding Progress</CardTitle>
          <CardDescription>Complete all steps to publish your expert profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {EXPERT_ONBOARDING_STEPS.map((step, index) => {
              const status = getStepStatus(step);

              return (
                <div
                  key={step}
                  className={`flex items-start space-x-4 ${
                    status === 'upcoming' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="mt-0.5">
                    {status === 'complete' ? (
                      <CheckCircle className="h-6 w-6 text-primary" />
                    ) : status === 'current' ? (
                      <Circle
                        className="h-6 w-6 text-primary"
                        fill="currentColor"
                        strokeWidth={0}
                      />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">
                        {index + 1}. {stepLabels[step]}
                      </h3>
                      <Button
                        variant={status === 'complete' ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => goToStep(step)}
                        disabled={status === 'upcoming'}
                      >
                        {status === 'complete'
                          ? 'Review'
                          : status === 'current'
                            ? 'Continue'
                            : 'Start'}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{stepDescriptions[step]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          {isComplete && !profilePublished ? (
            <div className="flex w-full flex-col gap-4">
              <div className="rounded-md bg-primary/10 p-4">
                <div className="flex">
                  <div className="shrink-0">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-primary">All steps completed!</h3>
                    <div className="mt-2 text-sm text-primary/80">
                      <p>
                        You&apos;ve completed all the required steps. Your expert profile is ready
                        to be published.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <Button size="lg" onClick={publishProfile}>
                Publish Your Expert Profile
              </Button>
            </div>
          ) : profilePublished ? (
            <div className="flex w-full flex-col gap-4">
              <div className="rounded-md bg-primary/10 p-4">
                <div className="flex">
                  <div className="shrink-0">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-primary">Profile Published!</h3>
                    <div className="mt-2 text-sm text-primary/80">
                      <p>Your expert profile is now live and visible to potential clients.</p>
                    </div>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="lg" onClick={() => router.push('/expert/dashboard')}>
                Go to Expert Dashboard
              </Button>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-4">
              <div className="rounded-md bg-amber-50 p-4">
                <div className="flex">
                  <div className="shrink-0">
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">
                      Complete all steps to publish
                    </h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>
                        You need to complete all onboarding steps before your profile can be
                        published.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <Button variant="default" size="lg" onClick={() => goToStep(currentStep)}>
                Continue Onboarding
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
