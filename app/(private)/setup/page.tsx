'use client';

import * as React from 'react';
import { Button } from '@/components/atoms/button';
import { Skeleton } from '@/components/atoms/skeleton';
import { checkExpertSetupStatus } from '@/server/actions/expert-setup';
import { useUser } from '@clerk/nextjs';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Generate unique IDs for skeleton items
const skeletonIds = [
  'profile-skeleton',
  'settings-skeleton',
  'business-skeleton',
  'identity-skeleton',
  'security-skeleton',
  'product-skeleton',
  'discount-skeleton',
  'bank-skeleton',
];

// Step type definition
type SetupStep = {
  id: string;
  name: string;
  description: string;
  href: string;
  completed: boolean;
  position: number;
};

export default function ExpertSetupPage() {
  const { isLoaded, user } = useUser();
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: 'profile',
      name: 'Create your store',
      description: 'Take the first step towards making a living online',
      href: '/booking/expert',
      completed: false,
      position: 1,
    },
    {
      id: 'availability',
      name: 'Fine tune your store settings',
      description: 'Add a logo, contact email, and more',
      href: '/booking/schedule',
      completed: false,
      position: 2,
    },
    {
      id: 'events',
      name: 'Add business details',
      description: 'Enable live payments and all features',
      href: '/booking/events',
      completed: false,
      position: 3,
    },
    {
      id: 'identity',
      name: 'Verify your identity',
      description: 'Add your personal information',
      href: '/account/identity',
      completed: false,
      position: 4,
    },
    {
      id: 'google_account',
      name: 'Set up two-factor authentication (2FA)',
      description: 'Add additional security to your account',
      href: '/account/security',
      completed: false,
      position: 5,
    },
    {
      id: 'payment',
      name: 'Create your first product',
      description: 'Create and share your products',
      href: '/account/billing',
      completed: false,
      position: 6,
    },
    {
      id: 'discount',
      name: 'Add discount code',
      description: 'Level up your sales with discounts',
      href: '/booking/events',
      completed: false,
      position: 7,
    },
    {
      id: 'bank_account',
      name: 'Connect a bank account',
      description: 'Set up payout details so you can get paid',
      href: '/account/billing',
      completed: false,
      position: 8,
    },
  ]);

  // Load setup status on component mount
  useEffect(() => {
    const loadSetupStatus = async () => {
      if (!isLoaded || !user) return;

      try {
        const result = await checkExpertSetupStatus();
        if (result.success && result.setupStatus) {
          // Update completed steps
          setSteps((prev) =>
            prev.map((step) => ({
              ...step,
              completed: !!result.setupStatus?.[step.id as keyof typeof result.setupStatus],
            })),
          );
        }
      } catch (error) {
        console.error('Failed to load setup status:', error);
      }
    };

    loadSetupStatus();
  }, [isLoaded, user]);

  if (!isLoaded) {
    return <SetupSkeleton />;
  }

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Congrats on the new store!</h1>
          <p className="mt-2 text-muted-foreground">
            Complete these simple steps to get your store up and running
          </p>
        </div>

        <div className="space-y-6">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-6">
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xl">
                {step.position}
                {step.completed && (
                  <div className="absolute -right-1 -top-1 rounded-full bg-white p-0.5">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-medium">{step.name}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>

                {step.completed ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : (
                  <Button asChild>
                    <Link href={step.href}>
                      {step.id === 'google_account'
                        ? 'Configure'
                        : step.id === 'discount'
                          ? 'Add Discount'
                          : step.id === 'payment'
                            ? 'Create Product'
                            : 'Complete'}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SetupSkeleton() {
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <Skeleton className="mx-auto h-10 w-64" />
          <Skeleton className="mx-auto mt-2 h-5 w-80" />
        </div>

        <div className="space-y-6">
          {skeletonIds.map((id) => (
            <div key={id} className="flex items-start gap-6">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex flex-1 items-center justify-between">
                <div className="w-3/4 space-y-1">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
