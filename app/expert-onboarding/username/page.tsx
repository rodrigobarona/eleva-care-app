'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { useExpertOnboarding } from '@/components/molecules/ExpertOnboardingProvider';
import { OnboardingStepNav, StepNavigationButtons } from '@/components/molecules/OnboardingStepNav';
import { cn } from '@/lib/utils';
import { Check, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function UsernameStepPage() {
  const { markStepComplete, completedSteps } = useExpertOnboarding();

  const [username, setUsername] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check if this step is already completed, and if so, load the saved username
  useEffect(() => {
    async function loadExistingUsername() {
      try {
        const response = await fetch('/api/expert/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.username) {
            setUsername(data.username);
            setIsAvailable(true);
          }
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
      }
    }

    if (completedSteps.includes('username')) {
      loadExistingUsername();
    }
  }, [completedSteps]);

  // Validate the username format
  const isValidFormat = (value: string) => {
    // Only allow alphanumeric characters, underscores, and dashes
    // Must be between 3-30 characters long
    const regex = /^[a-zA-Z0-9_-]{3,30}$/;
    return regex.test(value);
  };

  // Check username availability
  const checkUsername = async (value: string) => {
    if (!isValidFormat(value)) {
      setIsAvailable(false);
      setErrorMessage(
        'Username must be 3-30 characters and can only contain letters, numbers, underscores, and dashes.',
      );
      return;
    }

    setIsValidating(true);
    setErrorMessage('');

    try {
      const response = await fetch(`/api/check-username?username=${value}`);
      const data = await response.json();

      setIsAvailable(data.available);

      if (!data.available) {
        setErrorMessage('This username is already taken. Please choose another one.');
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setErrorMessage('Error checking username availability. Please try again.');
      setIsAvailable(false);
    } finally {
      setIsValidating(false);
    }
  };

  // Handle input change with debounce
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setIsAvailable(null);

    // Simple debounce
    if (value) {
      const timeoutId = setTimeout(() => {
        checkUsername(value);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  };

  // Handle form submission
  const handleContinue = async () => {
    if (!username || !isAvailable) return;

    setSubmitting(true);

    try {
      const response = await fetch('/api/expert/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save username');
      }

      // Mark this step as complete and proceed to the next one
      await markStepComplete('username');
    } catch (error) {
      console.error('Error saving username:', error);
      setErrorMessage('Error saving username. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <OnboardingStepNav currentStep="username" />

      <Card>
        <CardHeader>
          <CardTitle>Choose Your Username</CardTitle>
          <CardDescription>
            Select a unique username for your booking page URL: eleva.care/username
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                eleva.care/
              </div>
              <Input
                id="username"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className={cn(
                  'pl-[5.5rem]',
                  isAvailable === true && 'border-green-500 pr-10',
                  isAvailable === false && 'border-red-500 pr-10',
                )}
                placeholder="your-username"
                autoComplete="off"
              />
              {isValidating && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {isAvailable === true && !isValidating && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
              )}
              {isAvailable === false && !isValidating && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <X className="h-4 w-4 text-red-500" />
                </div>
              )}
            </div>
            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
            {isAvailable && <p className="text-sm text-green-500">This username is available!</p>}
          </div>

          <div className="rounded-md bg-muted p-4">
            <div className="text-sm text-muted-foreground">
              <h4 className="font-medium text-foreground">Your booking page URL</h4>
              <p className="mt-1">
                Clients will book appointments with you at:{' '}
                <code className="rounded bg-muted-foreground/20 px-1 py-0.5">
                  eleva.care/{username || 'your-username'}
                </code>
              </p>
              <p className="mt-3">
                <strong>Tip:</strong> Choose a username that is professional and easy to remember.
                Consider using your name or your professional brand.
              </p>
            </div>
          </div>

          <StepNavigationButtons
            onContinue={handleContinue}
            continueBtnText={submitting ? 'Saving...' : 'Continue'}
            continueBtnDisabled={!username || !isAvailable || isValidating || submitting}
          />
        </CardContent>
      </Card>
    </>
  );
}
