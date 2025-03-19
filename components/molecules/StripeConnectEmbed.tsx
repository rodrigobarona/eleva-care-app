'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface StripeConnectEmbedProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StripeConnectEmbed({ onSuccess, onCancel }: StripeConnectEmbedProps) {
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createEmbeddedSession() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/stripe/connect-embedded', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create Connect session');
        }

        const data = await response.json();
        setConnectUrl(data.url);
      } catch (err) {
        console.error('Error creating Connect embedded session:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to create Connect onboarding session. Please try again.',
        );
        toast.error('Failed to load Connect onboarding');
      } finally {
        setIsLoading(false);
      }
    }

    createEmbeddedSession();

    // Listen for postMessage events from the Stripe iframe
    const handleMessage = (event: MessageEvent) => {
      // Verify the origin of the message
      if (event.origin !== 'https://connect.stripe.com') {
        return;
      }

      try {
        const data = JSON.parse(event.data);

        // Handle different message types
        if (data.type === 'done') {
          // User completed the flow
          toast.success('Connect account setup complete!');
          if (onSuccess) onSuccess();
        } else if (data.type === 'cancel') {
          // User canceled the flow
          if (onCancel) onCancel();
        }
      } catch {
        // Not a JSON message or not for us
        return;
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onSuccess, onCancel]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
        <span className="ml-3 text-muted-foreground">Loading Connect onboarding...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
        <div className="text-destructive">Error: {error}</div>
        <button
          type="button"
          className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!connectUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-muted-foreground">No Connect URL available</div>
      </div>
    );
  }

  return (
    <iframe
      src={connectUrl}
      title="Stripe Connect Onboarding"
      style={{ border: 0 }}
      className="h-full w-full"
    />
  );
}
