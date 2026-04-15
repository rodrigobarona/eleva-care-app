'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  type ConnectElementTagName,
  loadConnectAndInitialize,
  type StripeConnectInstance,
} from '@stripe/connect-js';
import { AlertCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type StripeConnectWidgetsProps = {
  enabled: boolean;
};

function createWidget(
  connectInstance: StripeConnectInstance,
  container: HTMLDivElement,
  tagName: ConnectElementTagName,
) {
  const element = connectInstance.create(tagName);
  container.replaceChildren(element);
  return () => {
    element.remove();
    container.replaceChildren();
  };
}

export function StripeConnectWidgets({ enabled }: StripeConnectWidgetsProps) {
  const balancesRef = useRef<HTMLDivElement | null>(null);
  const payoutsRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    let cleanupBalances = () => undefined;
    let cleanupPayouts = () => undefined;
    let isCancelled = false;

    async function initializeWidgets() {
      if (!publishableKey) {
        if (!isCancelled) {
          setError('Stripe publishable key is missing.');
          setIsLoading(false);
        }
        return;
      }

      if (!balancesRef.current || !payoutsRef.current) {
        return;
      }

      try {
        const connectInstance = loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret: async () => {
            const response = await fetch('/api/stripe/connect/account-session', {
              method: 'POST',
            });

            const payload = await response.json();

            if (!response.ok || !payload.clientSecret) {
              throw new Error(payload.error || 'Failed to load Stripe Connect widgets.');
            }

            return payload.clientSecret;
          },
        });

        cleanupBalances = createWidget(connectInstance, balancesRef.current, 'balances');
        cleanupPayouts = createWidget(connectInstance, payoutsRef.current, 'payouts-list');

        if (!isCancelled) {
          setError(null);
          setIsLoading(false);
        }
      } catch (widgetError) {
        if (!isCancelled) {
          setError(
            widgetError instanceof Error ? widgetError.message : 'Failed to render Stripe widgets.',
          );
          setIsLoading(false);
        }
      }
    }

    void initializeWidgets();

    return () => {
      isCancelled = true;
      cleanupBalances();
      cleanupPayouts();
    };
  }, [enabled]);

  if (!enabled) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Connect your Stripe account first</AlertTitle>
        <AlertDescription>
          Complete your payout setup in Billing to unlock Stripe balance and payout widgets here.
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Unable to load Stripe widgets</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {isLoading && (
        <p className="text-sm text-muted-foreground">
          Loading Stripe balance and payout widgets...
        </p>
      )}
      <div className="min-h-[220px]" ref={balancesRef} />
      <div className="min-h-[320px]" ref={payoutsRef} />
    </div>
  );
}
