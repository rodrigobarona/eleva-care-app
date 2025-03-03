'use client';

import { Button } from '@/components/atoms/button';
import { Progress } from '@/components/atoms/progress';
import { cn } from '@/lib/utils';
import { checkExpertSetupStatus } from '@/server/actions/expert-setup';
import { useUser } from '@clerk/nextjs';
import { CheckCircle2, ChevronDown, ChevronUp, Circle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

type SetupStep = {
  id: string;
  name: string;
  description: string;
  href: string;
  completed: boolean;
  priority: number;
};

export function ExpertSetupChecklist() {
  const { isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCongrats, setShowCongrats] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProfilePublished, setIsProfilePublished] = useState(false);
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
      id: 'identity',
      name: 'Verify your identity',
      description: 'Complete identity verification for your account',
      href: '/account/identity',
      completed: false,
      priority: 4,
    },
    {
      id: 'payment',
      name: 'Connect payment account',
      description: 'Set up Stripe Connect to receive payments',
      href: '/account/billing',
      completed: false,
      priority: 5,
    },
  ]);

  const lastPathname = useRef(pathname);

  useEffect(() => {
    async function loadCompletionStatus() {
      setLoading(true);
      try {
        const result = await checkExpertSetupStatus();
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
        } else if (result.error) {
          console.error('Error checking expert setup status:', result.error);
        }
      } catch (error) {
        console.error('Failed to load completion status:', error);
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded) {
      loadCompletionStatus();
    }
  }, [isLoaded, router]);

  // Calculate progress percentage
  const completedSteps = setupSteps.filter((step) => step.completed).length;
  const totalSteps = setupSteps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  // Find the next step to complete based on priority
  const nextIncompleteStep = setupSteps
    .filter((step) => !step.completed)
    .sort((a, b) => a.priority - b.priority)[0];

  // Show congratulations when all steps are completed
  useEffect(() => {
    if (completedSteps === totalSteps && !loading) {
      setShowCongrats(true);
    }
  }, [completedSteps, totalSteps, loading]);

  // Handle navigation
  useEffect(() => {
    if (lastPathname.current !== pathname) {
      lastPathname.current = pathname;
      setShowCongrats(false);
    }
  });

  // If all steps are completed, show success message
  if (progressPercentage === 100) {
    return (
      <div className="mb-6 mt-1 w-full rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm dark:border-green-900 dark:bg-green-950">
        <div className="flex items-start space-x-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div className="space-y-1">
            <h3 className="font-medium text-green-800 dark:text-green-400">
              All expert setup steps completed! 🎉
            </h3>
            <p className="text-sm text-green-700 dark:text-green-500">
              {isProfilePublished
                ? 'Your expert profile is published and visible to clients.'
                : 'Your profile is ready to be published so clients can find and book your services.'}
            </p>
            <div className="pt-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-green-600 text-green-700 hover:bg-green-100 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900"
              >
                <Link href="/expert" className="flex items-center gap-1">
                  {isProfilePublished
                    ? 'Manage your published profile'
                    : 'Publish your expert profile'}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show anything if still loading and no steps are loaded yet
  if (loading && completedSteps === 0) return null;

  return (
    <>
      {showCongrats && (
        <div className="mb-6 mt-1 w-full rounded-lg border-2 border-green-500 bg-green-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-green-800">Congratulations! 🎉</h3>
              <p className="text-sm text-green-700">You&apos;ve completed all the setup steps!</p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCongrats(false)}
                className="text-green-700 hover:text-green-800"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}
