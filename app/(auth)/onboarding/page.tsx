'use client';

import type React from 'react';
import { Suspense, useState } from 'react';

import { redirect, useSearchParams } from 'next/navigation';

import { useOrganizationList, useUser } from '@clerk/nextjs';

import { Button } from '@/components/atoms/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';

function OnboardingForm() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { createOrganization, isLoaded: isOrgLoaded } = useOrganizationList();
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [orgName, setOrgName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [step, setStep] = useState(1);

  // Ensure that user and organization list are loaded before rendering
  if (!isUserLoaded || !isOrgLoaded) {
    return <div>Loading...</div>;
  }

  // Redirect user if not signed in
  if (!user) {
    redirect('/sign-in');
  }

  // Handle profile update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await user?.update({
        firstName,
        lastName,
      });
      setStep(2); // Move to the organization creation step
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle organization creation
  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const organization = await createOrganization({ name: orgName });
      if (organization) {
        const redirectTo = searchParams.get('redirect_to') || '/islogedin';
        redirect(redirectTo); // Redirect to dashboard or specified URL after organization creation
      }
    } catch (error) {
      console.error('Error creating organization:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Welcome!</CardTitle>
          <CardDescription>
            {step === 1 ? "Let's complete your profile" : 'Create your organization'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleUpdateProfile}>
              <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <CardFooter className="mt-4 flex justify-between">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Update Profile'}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleCreateOrganization}>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>
              <CardFooter className="mt-4 flex justify-between">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Creating...' : 'Create Organization'}
                </Button>
              </CardFooter>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OnboardingLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <div className="h-7 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-5 w-48 animate-pulse rounded-md bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-5 w-20 animate-pulse rounded-md bg-muted" />
              <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            </div>
            <div className="space-y-2">
              <div className="h-5 w-20 animate-pulse rounded-md bg-muted" />
              <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            </div>
            <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingForm />
    </Suspense>
  );
}
