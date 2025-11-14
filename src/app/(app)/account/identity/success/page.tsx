'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { useState } from 'react';

export default function IdentitySuccessPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setupConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/connect/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ country: 'US' }), // Default to US for this example
      });

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        // Handle HTTP error responses
        const errorText = await response.text();
        let errorMessage = `Error: ${response.status} ${response.statusText}`;

        try {
          // Try to parse as JSON if possible
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If not JSON, use the raw text
          if (errorText) errorMessage += ` - ${errorText}`;
        }

        setError(errorMessage);
        console.error('API error:', errorMessage);
        return;
      }

      const data = await response.json();

      if (data.success && data.onboardingUrl) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.onboardingUrl;
      } else {
        const errorMessage = data.error || 'Failed to create Connect account';
        setError(errorMessage);
        console.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error creating Connect account:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-6 w-6 text-green-500" aria-hidden="true" />
            Identity Verification Complete
          </CardTitle>
          <CardDescription>Your identity has been successfully verified.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Thank you for completing the identity verification process. You are now ready to set up
            your payment account to receive payments from clients.
          </p>
          <p>
            The next step is to set up your Stripe Connect account, which will allow you to receive
            payments directly to your bank account.
          </p>
          {error && (
            <p className="mt-4 text-red-500" role="alert">
              {error}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={setupConnect} disabled={loading} aria-busy={loading}>
            {loading ? 'Setting up Payment Account...' : 'Set Up Payment Account'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
