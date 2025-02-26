'use client';

import { Button } from '@/components/atoms/button';
import { Spinner } from '@/components/atoms/spinner';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface StripeConnectEmbedProps {
  email: string;
  country: string;
  onComplete: () => void;
  className?: string;
}

export function StripeConnectEmbed({
  email,
  country,
  onComplete,
  className,
}: StripeConnectEmbedProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // Load the onboarding flow
  useEffect(() => {
    const fetchConnectSession = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        const response = await fetch('/api/stripe/connect-embedded', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, country }),
        });

        if (!response.ok) {
          throw new Error('Failed to create Connect session');
        }

        const data = await response.json();

        if (data.clientSecret) {
          setConnectUrl(`https://connect.stripe.com/setup/s/${data.clientSecret}`);
        } else {
          throw new Error('No client secret returned');
        }
      } catch (error) {
        console.error('Error creating Connect session:', error);
        setHasError(true);
        toast.error('Failed to start Connect onboarding. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnectSession();
  }, [email, country]);

  // Handle iframe messaging from Stripe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://connect.stripe.com') return;

      try {
        const data = JSON.parse(event.data);

        if (data.type === 'onboard-complete') {
          toast.success('Account setup completed successfully!');
          onComplete();
        }
      } catch (error) {
        console.error('Failed to parse postMessage:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onComplete]);

  if (isLoading) {
    return (
      <div className={cn('flex h-full w-full items-center justify-center', className)}>
        <Spinner className="h-8 w-8" />
        <span className="ml-2 text-sm">Loading onboarding...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={cn('flex h-full flex-col items-center justify-center space-y-4', className)}>
        <p className="text-destructive">Failed to load Stripe Connect onboarding.</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if (!connectUrl) {
    return (
      <div className={cn('flex h-full w-full items-center justify-center', className)}>
        <p className="text-muted-foreground">Preparing Connect onboarding...</p>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <iframe
        src={connectUrl}
        style={{ border: 0 }}
        allow="transparency"
        className="h-full w-full"
        title="Stripe Connect Onboarding"
      />
    </div>
  );
}
