'use client';

import { Button } from '@/components/atoms/button';
import { Spinner } from '@/components/atoms/spinner';
import { cn } from '@/lib/utils';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Initialize Stripe with the publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentMethodSetupFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function PaymentMethodSetupForm({ onSuccess, onCancel }: PaymentMethodSetupFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/account/billing?setup_success=true`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred');
        toast.error(error.message || 'Failed to set up payment method');
      } else if (setupIntent) {
        toast.success('Payment method added successfully');
        onSuccess();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {errorMessage && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || !elements || isProcessing}>
          {isProcessing ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Processing...
            </>
          ) : (
            'Save Payment Method'
          )}
        </Button>
      </div>
    </form>
  );
}

interface StripePaymentMethodEmbedProps {
  onSuccess: () => void;
  onCancel: () => void;
  className?: string;
}

export function StripePaymentMethodEmbed({
  onSuccess,
  onCancel,
  className,
}: StripePaymentMethodEmbedProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSetupIntent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/stripe/create-setup-intent', {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to create setup intent');
        }

        const data = await response.json();

        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error('No client secret returned');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(message);
        toast.error('Failed to initialize payment setup');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSetupIntent();
  }, []);

  if (isLoading) {
    return (
      <div className={cn('flex h-full w-full items-center justify-center', className)}>
        <Spinner className="h-8 w-8" />
        <span className="ml-2 text-sm">Loading payment form...</span>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className={cn('flex h-full flex-col items-center justify-center space-y-4', className)}>
        <p className="text-destructive">{error || 'Failed to load payment form'}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className={cn('p-6', className)}>
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#0070f3',
              colorBackground: '#ffffff',
              colorText: '#1f2937',
              colorDanger: '#ef4444',
              fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
              borderRadius: '8px',
            },
          },
        }}
      >
        <PaymentMethodSetupForm
          clientSecret={clientSecret}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </Elements>
    </div>
  );
}
