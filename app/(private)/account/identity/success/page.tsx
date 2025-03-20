// app/(private)/account/identity/success/page.tsx
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
import { CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// app/(private)/account/identity/success/page.tsx

// app/(private)/account/identity/success/page.tsx

// app/(private)/account/identity/success/page.tsx

export default function IdentitySuccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const setupConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/connect/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ country: 'US' }), // Default to US for this example
      });

      const data = await response.json();

      if (data.success && data.onboardingUrl) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.onboardingUrl;
      } else {
        console.error('Failed to create Connect account:', data.error);
        router.push('/account/billing');
      }
    } catch (error) {
      console.error('Error creating Connect account:', error);
      router.push('/account/billing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-6 w-6 text-green-500" />
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
        </CardContent>
        <CardFooter>
          <Button onClick={setupConnect} disabled={loading}>
            {loading ? 'Setting up Payment Account...' : 'Set Up Payment Account'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
