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
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([
    {
      id: 'profile',
      name: 'Fill out your expert profile',
      description: 'Complete your profile with your expertise, bio, and profile picture',
      href: '/expert',
      completed: false,
      priority: 1,
    },
    {
      id: 'availability',
      name: 'Set your availability',
      description: "Define when you're available for consultations",
      href: '/schedule',
      completed: false,
      priority: 2,
    },
    {
      id: 'events',
      name: 'Create a service',
      description: 'Create at least one service to offer to clients',
      href: '/events',
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

  // Function to directly check if Google account is connected
  const verifyGoogleAccountConnection = useCallback(() => {
    if (!user) return false;

    const hasGoogleAccount = user.externalAccounts?.some(
      (account) =>
        account.provider === 'google' &&
        (account.verification?.status === 'verified' ||
          account.verification?.status === 'unverified'),
    );

    return hasGoogleAccount;
  }, [user]);

  // Enhanced loadCompletionStatus function
  const loadCompletionStatus = useCallback(
    async (options?: { showToast?: boolean; force?: boolean }) => {
      const showToast = options?.showToast ?? false;
      const force = options?.force ?? false;

      // Avoid frequent refreshes (no more than once every 3 seconds) unless forced
      if (!force && lastRefreshTime && new Date().getTime() - lastRefreshTime.getTime() < 3000) {
        return;
      }

      setLoading(true);
      try {
        // First update Google account status based on user data
        if (user) {
          // Direct check for Google account
          const isGoogleConnected = verifyGoogleAccountConnection();

          if (isGoogleConnected) {
            // Update the Google account step immediately while server action is in progress
            setSetupSteps((prev) =>
              prev.map((step) =>
                step.id === 'google_account' ? { ...step, completed: true } : step,
              ),
            );
          }
        }

        // Get full status from server (for all steps)
        const result = await checkExpertSetupStatus();
        setLastRefreshTime(new Date());

        if (result.success && result.setupStatus) {
          setSetupSteps((prev) =>
            prev.map((step) => ({
              ...step,
              completed: result.setupStatus?.[step.id] || false,
            })),
          );

          // Track whether the profile is already published
          if (result.isPublished !== undefined) {
            setIsProfilePublished(result.isPublished);
          }

          // If revalidation path was returned, refresh the UI
          if ('revalidatePath' in result) {
            router.refresh();
          }

          if (showToast) {
            toast.success('Expert setup status refreshed');
          }
        } else if (result.error) {
          console.error('Error checking expert setup status:', result.error);
          if (showToast) {
            toast.error('Failed to refresh setup status');
          }
        }
      } catch (error) {
        console.error('Failed to load completion status:', error);
        if (showToast) {
          toast.error('Failed to load your setup progress');
        }
      } finally {
        setLoading(false);
      }
    },
    [router, user, verifyGoogleAccountConnection, lastRefreshTime],
  );

  // Modified refresh button click handler
  const handleRefreshClick = () => {
    loadCompletionStatus({ showToast: true, force: true });
  };

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

  // Subscribe to events that might update the checklist status
  useEffect(() => {
    // Define function for handling custom events
    const handleStatusUpdate = () => {
      if (isLoaded) {
        loadCompletionStatus();
      }
    };

    // Handle Google account connection event with details
    const handleGoogleAccountConnected = (event: Event) => {
      if (isLoaded) {
        console.log(
          'Google account connection event received:',
          (event as CustomEvent)?.detail || 'No details available',
        );

        // Immediately mark the Google account step as complete for instant UI feedback
        setSetupSteps((prev) =>
          prev.map((step) => (step.id === 'google_account' ? { ...step, completed: true } : step)),
        );

        // Then refresh all steps from the server for complete validation
        loadCompletionStatus({ force: true });
      }
    };

    // Listen for custom events that signal a task update
    window.addEventListener('expert-setup-updated', handleStatusUpdate);
    window.addEventListener('google-account-connected', handleGoogleAccountConnected);

    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener('expert-setup-updated', handleStatusUpdate);
      window.removeEventListener('google-account-connected', handleGoogleAccountConnected);
    };
  }, [isLoaded, loadCompletionStatus]);

  // Calculate progress percentage
  const completedSteps = setupSteps.filter((step) => step.completed).length;
  const totalSteps = setupSteps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  // Find the next step to complete based on priority
  const nextIncompleteStep = setupSteps
    .filter((step) => !step.completed)
    .sort((a, b) => a.priority - b.priority)[0];

  // Show congratulations toast when all steps are completed (only once)
  useEffect(() => {
    // Prevent showing toast multiple times in same session
    if (toastShownInThisSession.current) return;

    // Wait until everything is fully loaded
    if (!isLoaded || !user || loading) return;

    // Only proceed if all steps are completed
    if (completedSteps === totalSteps) {
      // Strict check to make sure the value is exactly boolean true
      const toastAlreadyShown = user.unsafeMetadata?.setup_completion_toast_shown === true;

      if (!toastAlreadyShown) {
        // Mark that we've shown the toast in this session immediately
        toastShownInThisSession.current = true;

        // Show the toast
        toast.success(
          <div className="flex flex-col">
            <span className="font-medium">Congratulations! 🎉</span>
            <span className="text-sm">You&apos;ve completed all the setup steps!</span>
          </div>,
          {
            duration: 8000,
            action: {
              label: isProfilePublished ? 'Manage Profile' : 'Publish Profile',
              onClick: () => router.push('/expert'),
            },
          },
        );

        // Mark that we've shown the toast in Clerk's metadata
        try {
          user.update({
            unsafeMetadata: {
              ...user.unsafeMetadata,
              setup_completion_toast_shown: true,
            },
          });
        } catch (error) {
          console.error('Failed to update user metadata:', error);
        }
      }
    } else if (user.unsafeMetadata?.setup_completion_toast_shown === true) {
      // Reset the flag if steps are no longer complete
      try {
        user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            setup_completion_toast_shown: false,
          },
        });
      } catch (error) {
        console.error('Failed to reset user metadata:', error);
      }
    }
  }, [completedSteps, totalSteps, loading, isProfilePublished, router, isLoaded, user]);

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
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefreshClick}
            className="h-6 w-6"
            title="Refresh setup status"
            disabled={loading}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
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
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
