'use client';

import { EXPERT_ONBOARDING_STEPS, type OnboardingStep } from '@/lib/auth/expert-onboarding';
import { useAuth } from '@clerk/nextjs';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface ExpertOnboardingContextType {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  isComplete: boolean;
  profilePublished: boolean;
  isLoading: boolean;
  goToStep: (step: OnboardingStep) => void;
  markStepComplete: (step: OnboardingStep) => Promise<void>;
  publishProfile: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  getStepStatus: (step: OnboardingStep) => 'complete' | 'current' | 'upcoming';
}

const ExpertOnboardingContext = createContext<ExpertOnboardingContextType>({
  currentStep: 'username',
  completedSteps: [],
  isComplete: false,
  profilePublished: false,
  isLoading: true,
  goToStep: () => {},
  markStepComplete: async () => {},
  publishProfile: async () => {},
  refreshStatus: async () => {},
  getStepStatus: () => 'upcoming',
});

export function useExpertOnboarding() {
  return useContext(ExpertOnboardingContext);
}

interface ExpertOnboardingProviderProps {
  children: React.ReactNode;
}

export function ExpertOnboardingProvider({ children }: ExpertOnboardingProviderProps) {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('username');
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [profilePublished, setProfilePublished] = useState(false);

  const fetchOnboardingStatus = useCallback(async () => {
    if (!userId || !isSignedIn) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/expert/onboarding/status');

      if (!response.ok) {
        console.error('Failed to fetch onboarding status:', await response.text());
        return;
      }

      const data = await response.json();
      setCurrentStep(data.currentStep);
      setCompletedSteps(data.completedSteps);
      setIsComplete(data.isComplete);
      setProfilePublished(data.profilePublished);
    } catch (error) {
      console.error('Error fetching onboarding status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isSignedIn]);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      fetchOnboardingStatus();
    }
  }, [isLoaded, isSignedIn, userId, fetchOnboardingStatus]);

  const goToStep = (step: OnboardingStep) => {
    // Only allow going to a step if previous steps are completed
    const stepIndex = EXPERT_ONBOARDING_STEPS.indexOf(step);
    const previousSteps = EXPERT_ONBOARDING_STEPS.slice(0, stepIndex);

    const allPreviousStepsCompleted = previousSteps.every((s) => completedSteps.includes(s));

    if (allPreviousStepsCompleted) {
      window.location.href = `/expert-onboarding/${step}`;
    } else {
      console.warn('Cannot navigate to step until previous steps are completed');
    }
  };

  const markStepComplete = async (step: OnboardingStep) => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/expert/onboarding/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'completeStep',
          step,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update onboarding status');
      }

      const data = await response.json();
      setCurrentStep(data.currentStep);
      setCompletedSteps(data.completedSteps);
      setIsComplete(data.isComplete);
      setProfilePublished(data.profilePublished);

      // Navigate to the next step if available
      if (data.currentStep !== step) {
        window.location.href = `/expert-onboarding/${data.currentStep}`;
      }
    } catch (error) {
      console.error('Error updating onboarding status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const publishProfile = async () => {
    if (!userId || !isComplete) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/expert/onboarding/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'publishProfile',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish profile');
      }

      const data = await response.json();
      setProfilePublished(data.profilePublished);

      // Redirect to expert dashboard
      window.location.href = '/expert/dashboard';
    } catch (error) {
      console.error('Error publishing profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStatus = async () => {
    await fetchOnboardingStatus();
  };

  const getStepStatus = (step: OnboardingStep) => {
    if (completedSteps.includes(step)) return 'complete';
    if (step === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <ExpertOnboardingContext.Provider
      value={{
        currentStep,
        completedSteps,
        isComplete,
        profilePublished,
        isLoading,
        goToStep,
        markStepComplete,
        publishProfile,
        refreshStatus,
        getStepStatus,
      }}
    >
      {children}
    </ExpertOnboardingContext.Provider>
  );
}
