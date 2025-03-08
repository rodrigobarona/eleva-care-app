import { checkExpertSetupStatus, markStepComplete } from '@/server/actions/expert-setup';
import type { ExpertSetupStep } from '@/server/actions/expert-setup';
import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Custom hook for managing expert setup state and metadata
 * Provides methods for completing steps, checking status, and syncing with Clerk metadata
 */
export function useExpertSetup() {
  const { isLoaded, user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [setupStatus, setSetupStatus] = useState<Record<ExpertSetupStep, boolean>>({
    profile: false,
    availability: false,
    events: false,
    identity: false,
    payment: false,
    google_account: false,
  });

  // Function to load the current status from the server
  const loadStatus = useCallback(async () => {
    if (!isLoaded || !user) return;

    setIsLoading(true);
    try {
      const result = await checkExpertSetupStatus();
      if (result.success && result.setupStatus) {
        setSetupStatus(result.setupStatus as Record<ExpertSetupStep, boolean>);
      }
    } catch (error) {
      console.error('Error loading expert setup status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, user]);

  // Load status on initial mount
  useEffect(() => {
    if (isLoaded && user) {
      loadStatus();
    }
  }, [isLoaded, user, loadStatus]);

  // Function to update metadata for a single step
  const completeStep = useCallback(
    async (step: ExpertSetupStep) => {
      if (!isLoaded || !user) return false;

      try {
        // Call the server action to mark step as complete
        const result = await markStepComplete(step);

        if (result.success) {
          // Update local state
          setSetupStatus((prev) => ({
            ...prev,
            [step]: true,
          }));

          // Dispatch event to notify any listeners
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('expert-setup-updated'));

            // Additional step-specific events
            if (step === 'google_account') {
              const customEvent = new CustomEvent('google-account-connected', {
                detail: { timestamp: new Date().toISOString() },
              });
              window.dispatchEvent(customEvent);
            }
          }

          // Show success message
          toast.success(
            `${step.charAt(0).toUpperCase() + step.slice(1).replace('_', ' ')} step completed!`,
          );
          return true;
        }

        if (result.error) {
          toast.error(`Failed to mark step as complete: ${result.error}`);
        }

        return false;
      } catch (error) {
        console.error(`Error completing ${step} step:`, error);
        toast.error(`Failed to complete ${step} step`);
        return false;
      }
    },
    [isLoaded, user],
  );

  // Function to check if all steps are complete
  const isComplete = useCallback(() => {
    return Object.values(setupStatus).every(Boolean);
  }, [setupStatus]);

  // Calculate progress percentage
  const progressPercentage = Math.round(
    (Object.values(setupStatus).filter(Boolean).length / Object.keys(setupStatus).length) * 100,
  );

  return {
    setupStatus,
    isLoading,
    progressPercentage,
    isComplete: isComplete(),
    completeStep,
    refreshStatus: loadStatus,
  };
}
