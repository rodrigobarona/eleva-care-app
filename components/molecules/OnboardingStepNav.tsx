'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent } from '@/components/atoms/card';
import { useExpertOnboarding } from '@/components/molecules/ExpertOnboardingProvider';
import { EXPERT_ONBOARDING_STEPS, type OnboardingStep } from '@/lib/auth/expert-onboarding';
import { ArrowLeft, CheckCircle, ChevronRight, Circle, CircleDot } from 'lucide-react';
import Link from 'next/link';

interface OnboardingStepNavProps {
  currentStep: OnboardingStep;
}

export function OnboardingStepNav({ currentStep }: OnboardingStepNavProps) {
  const { completedSteps, getStepStatus } = useExpertOnboarding();

  const stepLabels: Record<OnboardingStep, string> = {
    username: 'Username',
    events: 'Events',
    schedule: 'Schedule',
    profile: 'Profile',
    billing: 'Billing',
    identity: 'Identity',
  };

  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between px-2">
          <Link href="/expert-onboarding" passHref>
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Overview
            </Button>
          </Link>

          <div className="flex items-center">
            {EXPERT_ONBOARDING_STEPS.map((step, index) => {
              const status = getStepStatus(step);
              const isActive = step === currentStep;
              const isLast = index === EXPERT_ONBOARDING_STEPS.length - 1;

              return (
                <div key={step} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground'
                          : status === 'complete'
                            ? 'border-primary text-primary'
                            : 'border-muted text-muted-foreground'
                      }`}
                    >
                      {status === 'complete' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : isActive ? (
                        <CircleDot className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>
                    <span
                      className={`text-xs ${
                        isActive
                          ? 'font-medium text-foreground'
                          : status === 'complete'
                            ? 'text-primary'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {stepLabels[step]}
                    </span>
                  </div>

                  {!isLast && (
                    <div
                      className={`h-0.5 w-8 ${
                        completedSteps.includes(step) ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="w-[70px]" />
        </div>
      </CardContent>
    </Card>
  );
}

interface StepNavigationButtonsProps {
  onContinue: () => void;
  onSkip?: () => void;
  continueBtnText?: string;
  continueBtnDisabled?: boolean;
  showSkip?: boolean;
  skipBtnText?: string;
}

export function StepNavigationButtons({
  onContinue,
  onSkip,
  continueBtnText = 'Continue',
  continueBtnDisabled = false,
  showSkip = false,
  skipBtnText = 'Skip for now',
}: StepNavigationButtonsProps) {
  return (
    <div className="mt-6 flex justify-end gap-4">
      {showSkip && onSkip && (
        <Button variant="ghost" onClick={onSkip}>
          {skipBtnText}
        </Button>
      )}
      <Button onClick={onContinue} disabled={continueBtnDisabled}>
        {continueBtnText}
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}
