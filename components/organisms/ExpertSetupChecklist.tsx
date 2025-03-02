'use client';

import { Button } from '@/components/atoms/button';
import { Progress } from '@/components/atoms/progress';
import { cn } from '@/lib/utils';
import { checkExpertSetupStatus } from '@/server/actions/expert-setup';
import { useUser } from '@clerk/nextjs';
import { CheckCircle2, ChevronDown, ChevronUp, Circle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
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
        }
      } catch (error) {
        console.error('Failed to load expert setup status:', error);
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded) {
      loadCompletionStatus();
    }
  }, [isLoaded]);

  // Calculate progress percentage
  const completedSteps = setupSteps.filter((step) => step.completed).length;
  const progressPercentage = Math.round((completedSteps / setupSteps.length) * 100);

  // Find the next step to complete based on priority
  const nextIncompleteStep = setupSteps
    .filter((step) => !step.completed)
    .sort((a, b) => a.priority - b.priority)[0];

  // Don't show anything if all steps are completed or still loading
  if (progressPercentage === 100) return null;

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
