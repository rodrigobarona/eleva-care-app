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
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isUpdating, setIsUpdating] = useState(false);

  // Show loading state while Clerk loads
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Redirect if not signed in
  if (!isSignedIn) {
    redirect('/sign-in');
  }

  // Handle profile update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      // Update user profile
      await user?.update({
        firstName,
        lastName,
      });

      // Update user metadata using unsafeMetadata (recommended for Clerk v6)
      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          onboardingComplete: true,
        },
      });

      toast.success('Profile updated successfully');
      redirect('/dashboard');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Welcome to Eleva Care!</CardTitle>
          <CardDescription>Let&apos;s complete your profile</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  required
                  disabled={isUpdating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  required
                  disabled={isUpdating}
                />
              </div>
            </div>
            <CardFooter className="px-0 pt-4">
              <Button type="submit" className="w-full" disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Complete Profile'}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
