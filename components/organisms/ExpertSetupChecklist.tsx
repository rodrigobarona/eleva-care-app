'use client';

import { Button } from '@/components/atoms/button';
import { Progress } from '@/components/atoms/progress';
import { cn } from '@/lib/utils';
import { checkExpertSetupStatus } from '@/server/actions/expert-setup';
import { useUser } from '@clerk/nextjs';
import { CheckCircle2, ChevronDown, ChevronUp, Circle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type SetupStep = {
  id: string;
  name: string;
  description: string;
  href: string;
  completed: boolean;
  priority: number;
};

export function ExpertSetupChecklist() {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProfilePublished, setIsProfilePublished] = useState(false);
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([
    {
      id: 'profile',
      name: 'Fill out your expert profile',
      description: 'Complete your profile with your expertise, bio, and profile picture',
      href: '/booking/expert',
      completed: false,
      priority: 1,
    },
    {
      id: 'availability',
      name: 'Set your availability',
      description: "Define when you're available for consultations",
      href: '/booking/schedule',
      completed: false,
      priority: 2,
    },
    {
      id: 'events',
      name: 'Create a service',
      description: 'Create at least one service to offer to clients',
      href: '/booking/events',
      completed: false,
      priority: 3,
    },
    {
      id: 'google_account',
      name: 'Connect Google account',
      description: 'Connect your Google account for calendar integration',
      href: '/account/security',
      completed: false,
      priority: 4,
    },
    {
      id: 'identity',
      name: 'Verify your identity',
      description: 'Complete identity verification for your account',
      href: '/account/identity',
      completed: false,
      priority: 5,
    },
    {
      id: 'payment',
      name: 'Connect payment account',
      description: 'Set up Stripe Connect to receive payments',
      href: '/account/billing',
      completed: false,
      priority: 6,
    },
  ]);

  const lastPathname = useRef(pathname);
  // Track if toast has been shown in this component instance
  const toastShownInThisSession = useRef(false);
  // Add a ref to track which steps have already shown a toast in this session
  const toastShownForSteps = useRef<Record<string, boolean>>({});

  // For refresh button state
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pressCount, setPressCount] = useState(0);

  // Extract loadCompletionStatus to make it reusable
  const loadCompletionStatus = useCallback(async () => {
    setLoading(true);
    try {
      const result = await checkExpertSetupStatus();
      if (result.success && result.setupStatus) {
        setSetupSteps((prev) =>
          prev.map((step) => ({
            ...step,
            completed: result.setupStatus?.[step.id as keyof typeof result.setupStatus] || false,
          })),
        );

        // Track whether the profile is already published
        if (result.isPublished !== undefined) {
          setIsProfilePublished(!!result.isPublished);
        }

        // If revalidation path was returned, refresh the UI
        if ('revalidatePath' in result) {
          router.refresh();
        }
      } else if (result.error) {
        console.error('Error checking expert setup status:', result.error);
      }
    } catch (error) {
      console.error('Failed to load completion status:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Handle navigation - refresh status when path changes
  useEffect(() => {
    if (lastPathname.current !== pathname) {
      lastPathname.current = pathname;
      // Refresh the completion status when returning from a task page
      if (isLoaded) {
        loadCompletionStatus();
      }
    }
  }, [pathname, isLoaded, loadCompletionStatus]);

  // Initial load
  useEffect(() => {
    if (isLoaded) {
      loadCompletionStatus();
    }
  }, [isLoaded, loadCompletionStatus]);

  // Handle Google account disconnection specifically
  const handleGoogleAccountDisconnected = useCallback(
    (event: Event) => {
      console.log('Google account disconnected event received:', event);
      if (isLoaded) {
        // Directly update the Google account step in the UI for immediate feedback
        setSetupSteps((prev) =>
          prev.map((step) => (step.id === 'google_account' ? { ...step, completed: false } : step)),
        );

        // Update the metadata to reflect the disconnection
        if (user) {
          const currentMetadata = { ...user.unsafeMetadata };
          if (currentMetadata.expertSetup) {
            const expertSetup = currentMetadata.expertSetup as Record<string, boolean>;
            expertSetup.google_account = false;

            // Update the user metadata
            user
              .update({
                unsafeMetadata: currentMetadata,
              })
              .catch((error) => {
                console.error('Error updating user metadata after Google disconnection:', error);
              });
          }
        }

        // Then reload the full status from the server to ensure everything is in sync
        loadCompletionStatus();
      }
    },
    [isLoaded, user, loadCompletionStatus],
  );

  // Subscribe to events that might update the checklist status
  useEffect(() => {
    // Define function for handling custom events
    const handleStatusUpdate = () => {
      if (isLoaded) {
        loadCompletionStatus();
      }
    };

    // Listen for custom events that signal a task update
    window.addEventListener('expert-setup-updated', handleStatusUpdate);
    window.addEventListener('google-account-disconnected', handleGoogleAccountDisconnected);

    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener('expert-setup-updated', handleStatusUpdate);
      window.removeEventListener('google-account-disconnected', handleGoogleAccountDisconnected);
    };
  }, [isLoaded, loadCompletionStatus, handleGoogleAccountDisconnected]);

  // Add a function to check if all steps are complete based on Clerk metadata
  const checkAllStepsCompleteFromMetadata = useCallback(() => {
    if (!isLoaded || !user) return false;

    // Get the expert setup metadata
    const expertSetupMetadata = user.unsafeMetadata?.expertSetup as
      | Record<string, boolean>
      | undefined;

    // If no metadata exists, steps are not complete
    if (!expertSetupMetadata) return false;

    // Define the required steps
    const requiredSteps = [
      'profile',
      'availability',
      'events',
      'identity',
      'payment',
      'google_account',
    ];

    // Check if all required steps exist and are true
    const allComplete = requiredSteps.every((step) => expertSetupMetadata[step] === true);

    console.log('Checking completion from metadata:', {
      expertSetupMetadata,
      requiredSteps,
      allComplete,
    });

    return allComplete;
  }, [isLoaded, user]);

  // Enhanced sync with metadata to detect completion
  const syncWithClerkMetadata = useCallback(() => {
    if (!isLoaded || !user) return;

    // Extract expert setup status from user metadata
    const expertSetupMetadata = (user.unsafeMetadata?.expertSetup as Record<string, boolean>) || {};

    // Keep track of any newly completed steps
    const newlyCompletedSteps: string[] = [];

    // Update setupSteps based on metadata, but only mark as complete
    setSetupSteps((prevSteps) =>
      prevSteps.map((step) => {
        const isCompleteInMetadata = !!expertSetupMetadata[step.id];

        // Only update to true, never revert to false (which needs server validation)
        if (isCompleteInMetadata && !step.completed) {
          console.log(`Step ${step.id} marked as complete based on metadata update`);
          newlyCompletedSteps.push(step.id);
          return { ...step, completed: true };
        }
        return step;
      }),
    );

    // Show toast for newly completed steps, but only once per session
    for (const stepId of newlyCompletedSteps) {
      if (!toastShownForSteps.current[stepId]) {
        const stepName = setupSteps.find((s) => s.id === stepId)?.name || stepId;

        toast.success(`${stepName} completed!`, {
          id: `step-complete-${stepId}`, // Use ID to prevent duplicates
          duration: 3000,
        });

        // Mark this step as having shown a toast in this session
        toastShownForSteps.current[stepId] = true;
      }
    }

    // Check if all steps are complete based on metadata directly
    const allCompleteFromMetadata = checkAllStepsCompleteFromMetadata();
    if (allCompleteFromMetadata) {
      // Force an update of the completedSteps count to trigger the completion logic
      setSetupSteps((currentSteps) => [...currentSteps]);
    }

    // Calculate new progress after update
    const completedCount = Object.values(expertSetupMetadata).filter(Boolean).length;
    const totalCount = setupSteps.length;
    const newProgressPercentage = Math.round((completedCount / totalCount) * 100);

    // Log the sync for debugging
    console.log('Synced with Clerk metadata:', {
      expertSetupMetadata,
      newProgressPercentage,
      newlyCompletedSteps,
      allCompleteFromMetadata,
    });
  }, [isLoaded, user, setupSteps, checkAllStepsCompleteFromMetadata]);

  // Check identity verification status directly from API
  const checkIdentityVerification = useCallback(async () => {
    if (!isLoaded || !user) return false;

    try {
      // Call a server action to check identity verification status
      const response = await fetch('/api/expert/identity-status');

      if (!response.ok) {
        throw new Error('Failed to check identity verification status');
      }

      const data = await response.json();

      // Update the step status immediately if verified, but don't show toast here
      if (data.verified === true) {
        // Just update the state, don't show toast
        setSetupSteps((prev) =>
          prev.map((step) => (step.id === 'identity' ? { ...step, completed: true } : step)),
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking identity verification status:', error);
      return false;
    }
  }, [isLoaded, user]);

  // Check Google account connection directly
  const verifyGoogleAccountConnection = useCallback(async () => {
    if (!isLoaded || !user) return false;

    try {
      // Check if the user has a Google account connected
      const hasGoogleAccount = user.externalAccounts.some(
        (account) => account.provider === 'google',
      );

      // If Google account is connected but not showing as completed,
      // update the step immediately for better UX
      if (hasGoogleAccount) {
        const googleStep = setupSteps.find((step) => step.id === 'google_account');
        if (googleStep && !googleStep.completed) {
          setSetupSteps((prev) =>
            prev.map((step) =>
              step.id === 'google_account' ? { ...step, completed: true } : step,
            ),
          );

          // Then call the server to update all statuses
          loadCompletionStatus();
        }
      }

      return hasGoogleAccount;
    } catch (error) {
      console.error('Error verifying Google account connection:', error);
      return false;
    }
  }, [isLoaded, user, setupSteps, loadCompletionStatus]);

  // Handle Google account connection event
  const handleGoogleAccountConnected = useCallback(
    (event: Event) => {
      if (!isLoaded || !user) return;

      // Access the detailed event data if available
      const detail = (event as CustomEvent)?.detail;
      console.log('Google account connected event received:', detail);

      // Update setupSteps to mark Google account as connected
      setSetupSteps((prev) =>
        prev.map((step) => (step.id === 'google_account' ? { ...step, completed: true } : step)),
      );

      // Reload all step status from server
      loadCompletionStatus();
    },
    [isLoaded, user, loadCompletionStatus],
  );

  useEffect(() => {
    // Listen for the Google account connected event
    window.addEventListener('google-account-connected', handleGoogleAccountConnected);

    // Clean up
    return () => {
      window.removeEventListener('google-account-connected', handleGoogleAccountConnected);
    };
  }, [handleGoogleAccountConnected]);

  // Check both Google account and identity verification on initial load
  useEffect(() => {
    if (isLoaded && user) {
      verifyGoogleAccountConnection();
      checkIdentityVerification();
    }
  }, [isLoaded, user, verifyGoogleAccountConnection, checkIdentityVerification]);

  // Function to perform silent checks without toasts
  const silentChecks = useCallback(async () => {
    // Disable toasts temporarily for these checks
    const originalToasts = { ...toastShownForSteps.current };

    try {
      await verifyGoogleAccountConnection();
      await checkIdentityVerification();

      // If all steps appear complete in metadata, check for completion
      if (user) {
        const metadataComplete = checkAllStepsCompleteFromMetadata();
        const setupMetadata = user.unsafeMetadata?.expertSetup as
          | Record<string, boolean>
          | undefined;
        const completionShown = user.unsafeMetadata?.setup_completion_toast_shown;

        if (
          metadataComplete &&
          setupMetadata &&
          Object.values(setupMetadata).every((val) => val === true) &&
          !completionShown
        ) {
          // All steps seem complete but toast not shown - log this situation
          console.log(
            'Detected all steps complete in metadata but setup_completion_toast_shown is false',
          );
        }
      }
    } finally {
      // Restore toast state
      toastShownForSteps.current = originalToasts;
    }
  }, [
    user,
    verifyGoogleAccountConnection,
    checkIdentityVerification,
    checkAllStepsCompleteFromMetadata,
  ]);

  // Enhanced refresh with better handling
  const handleRefreshClick = useCallback(() => {
    const now = Date.now();
    // Throttle refreshes to once every 2 seconds
    if (now - lastRefreshTime < 2000) {
      toast.info('Please wait a moment before refreshing again');
      return;
    }

    // Prevent multiple refresh operations
    if (isRefreshing) {
      return;
    }

    setLastRefreshTime(now);
    setIsRefreshing(true);

    // Show loading indicator
    const toastId = 'checklist-refresh';
    toast.loading('Updating setup status...', { id: toastId });

    // First silently check, then load from server
    Promise.all([silentChecks(), loadCompletionStatus()])
      .then(() => {
        // After loading from server, sync with metadata
        syncWithClerkMetadata();
        toast.success('Setup status updated', { id: toastId });
      })
      .catch((error) => {
        console.error('Error refreshing setup status:', error);
        toast.error('Failed to update status', { id: toastId });
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, [lastRefreshTime, isRefreshing, silentChecks, loadCompletionStatus, syncWithClerkMetadata]);

  // Long-press handling functionality
  const handleRefreshMouseDown = useCallback(() => {
    // Start a timer when the button is pressed
    setPressCount((count) => count + 1);

    // If pressed 5 times rapidly, trigger force check
    if (pressCount >= 4) {
      // Reset counter
      setPressCount(0);
      // Show toast
      toast.info('Force refreshing setup status...');
      // Refresh status
      loadCompletionStatus();
      return;
    }

    const timer = setTimeout(() => {
      // If button is held for 1.5 seconds, show indicator
      toast.info('Release to force refresh', {
        id: 'long-press-indicator',
        duration: 1000,
      });

      setPressTimer(null);
    }, 1500);

    setPressTimer(timer);
  }, [pressCount, loadCompletionStatus]);

  const handleRefreshMouseUp = useCallback(() => {
    // Clear the timer when button is released
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  }, [pressTimer]);

  // Function to directly fix the completion status
  const forceFixCompletionStatus = async () => {
    if (!isLoaded || !user) return;

    try {
      toast.loading('Fixing completion status...', { id: 'fix-completion' });

      // Check server-side status
      const result = await checkExpertSetupStatus();

      if (result.success && result.setupStatus) {
        const allComplete = Object.values(result.setupStatus).every(Boolean);

        if (allComplete) {
          // If all steps are complete, update the metadata
          const timestamp = new Date().toISOString();

          await user.update({
            unsafeMetadata: {
              ...user.unsafeMetadata,
              setup_completion_toast_shown: true,
              setup_completion_toast_shown_at: timestamp,
              setup_completed_at: timestamp,
            },
          });

          toast.success('Completion status fixed!', { id: 'fix-completion' });

          // Reload after a delay
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          // Not all steps complete
          toast.error('Not all steps are complete', { id: 'fix-completion' });
        }
      } else {
        toast.error('Failed to check completion status', { id: 'fix-completion' });
      }
    } catch (error) {
      console.error('Error fixing completion status:', error);
      toast.error('Error fixing completion status', { id: 'fix-completion' });
    }
  };

  // Calculate progress percentage
  const completedSteps = setupSteps.filter((step) => step.completed).length;
  const totalSteps = setupSteps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  // Find the next step to complete based on priority
  const nextIncompleteStep = setupSteps
    .filter((step) => !step.completed)
    .sort((a, b) => a.priority - b.priority)[0];

  // Create the refresh button component
  const RefreshButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefreshClick}
      onMouseDown={handleRefreshMouseDown}
      onMouseUp={handleRefreshMouseUp}
      onMouseLeave={handleRefreshMouseUp}
      className="relative h-6 w-6"
      title="Refresh setup status (multiple clicks to force refresh)"
      disabled={isRefreshing}
    >
      <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
      {pressCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground">
          {pressCount}
        </span>
      )}
    </Button>
  );

  // Check if we should show the fix button
  const showFixButton =
    isLoaded &&
    user &&
    user.unsafeMetadata?.expertSetup &&
    Object.values(user.unsafeMetadata.expertSetup as Record<string, boolean>).every(Boolean) &&
    !user.unsafeMetadata?.setup_completion_toast_shown;

  // Create the fix button component (typed correctly)
  const FixCompletionButton = showFixButton ? (
    <Button variant="outline" size="sm" onClick={forceFixCompletionStatus} className="ml-2 text-xs">
      Fix Completion
    </Button>
  ) : null;

  // Show congratulations toast when all steps are completed (only once)
  useEffect(() => {
    // Wait until everything is fully loaded
    if (!isLoaded || !user || loading) return;

    // Check for completion in two ways:
    // 1. Based on local state
    const localStateComplete = completedSteps === totalSteps;

    // 2. Based directly on metadata (more reliable)
    const metadataComplete = checkAllStepsCompleteFromMetadata();

    // Only proceed if all steps are complete by either method
    if (localStateComplete || metadataComplete) {
      // Log completion detection
      console.log('Detected completion:', { localStateComplete, metadataComplete });

      // Check if we've already shown the toast in THIS session
      if (toastShownInThisSession.current) return;

      // Check if we've already shown the toast EVER by looking at metadata
      const completionToastTimestamp = user.unsafeMetadata?.setup_completion_toast_shown_at;
      const hasShownToastBefore = !!completionToastTimestamp;

      if (!hasShownToastBefore) {
        // Mark that we've shown the toast in this session immediately
        toastShownInThisSession.current = true;

        // Get current timestamp to store in metadata
        const currentTimestamp = new Date().toISOString();

        // Show the toast
        toast.success(
          <div className="flex flex-col">
            <span className="font-medium">Congratulations! 🎉</span>
            <span className="text-sm">You&apos;ve completed all the setup steps!</span>
            <span className="mt-1 text-xs text-muted-foreground">
              Completed on {new Date().toLocaleDateString()}
            </span>
          </div>,
          {
            duration: 8000,
            action: {
              label: isProfilePublished ? 'Manage Profile' : 'Publish Profile',
              onClick: () => router.push('/expert'),
            },
          },
        );

        // Store timestamp in Clerk's metadata
        try {
          user.update({
            unsafeMetadata: {
              ...user.unsafeMetadata,
              setup_completion_toast_shown: true,
              setup_completion_toast_shown_at: currentTimestamp,
              setup_completed_at: currentTimestamp,
            },
          });

          // Log for debugging
          console.log('Stored setup completion timestamp in metadata:', currentTimestamp);
        } catch (error) {
          console.error('Failed to update user metadata with completion timestamp:', error);
        }
      } else {
        // Already shown before, log for debugging
        console.log('Setup completion toast already shown on:', completionToastTimestamp);
      }
    } else if (
      completedSteps < totalSteps &&
      user.unsafeMetadata?.setup_completion_toast_shown === true
    ) {
      // Reset the flag if steps are no longer complete
      try {
        user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            setup_completion_toast_shown: false,
            // Don't remove the timestamp - we want to keep track of when it was completed before
          },
        });
      } catch (error) {
        console.error('Failed to reset user metadata:', error);
      }
    }
  }, [
    isProfilePublished,
    router,
    isLoaded,
    user,
    loading,
    checkAllStepsCompleteFromMetadata,
    completedSteps,
    totalSteps,
  ]);

  // Add a helper function to get a more detailed description for a step
  const getStepDetails = (stepId: string) => {
    switch (stepId) {
      case 'identity':
        return {
          pendingDescription:
            'You must complete the Stripe identity verification process to verify your identity',
          completedDescription: 'Your identity has been verified through Stripe Verify',
          inProgressDescription: 'Your identity verification is being processed by Stripe',
        };
      case 'google_account':
        return {
          pendingDescription: 'Connect your Google account for calendar integration',
          completedDescription: 'Your Google account is connected',
          inProgressDescription: 'Finalizing your Google account connection',
        };
      default:
        return {
          pendingDescription: '',
          completedDescription: '',
          inProgressDescription: '',
        };
    }
  };

  // If all steps are completed, don't show anything
  if (progressPercentage === 100) {
    return null;
  }

  // Don't show anything if still loading and no steps are loaded yet
  if (loading && completedSteps === 0) return null;

  return (
    <div className="mb-6 mt-1 w-full rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Complete your expert setup</h3>
          <div className="flex items-center gap-2">
            <Progress
              value={loading ? undefined : progressPercentage}
              className={cn('h-2 w-[100px]', loading && 'animate-pulse')}
            />
            <span className="text-xs text-muted-foreground">
              {loading ? 'Loading...' : `${progressPercentage}% complete`}
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          {nextIncompleteStep && !loading && (
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push(nextIncompleteStep.href)}
              className="text-xs"
            >
              {nextIncompleteStep.name}
            </Button>
          )}
          {RefreshButton}
          {FixCompletionButton}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {setupSteps.map((step) => (
            <div key={step.id} className="flex items-start space-x-3">
              <div className="mt-0.5">
                {loading ? (
                  <Circle className="h-5 w-5 animate-pulse text-muted-foreground" />
                ) : step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <Link
                    href={step.href}
                    className={cn(
                      'text-sm font-medium hover:underline',
                      step.completed ? 'text-muted-foreground' : 'text-foreground',
                    )}
                  >
                    {step.name}
                  </Link>
                  {!step.completed && !loading && (
                    <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                      <Link href={step.href}>Complete</Link>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {step.completed
                    ? getStepDetails(step.id).completedDescription || step.description
                    : getStepDetails(step.id).pendingDescription || step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
