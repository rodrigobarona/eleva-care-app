import { Button } from '@/components/atoms/button';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type React from 'react';
import { useState } from 'react';

type PaymentStepProps = {
  price: number;
  onBack: () => void;
};

export function PaymentStep({ price, onBack }: PaymentStepProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.error('Stripe or Elements not initialized');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Get all the parameters from the URL
      const searchParams = new URLSearchParams(window.location.search);
      const startTime = searchParams.get('time');
      const name = searchParams.get('name');
      const email = searchParams.get('email');

      if (!startTime) {
        console.error('No time found in URL parameters', searchParams.toString());
        setErrorMessage('Missing appointment time. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Create the success URL with all necessary parameters
      const successUrl = new URL(`${window.location.pathname}/success`, window.location.origin);
      successUrl.searchParams.set('startTime', startTime);
      if (name) successUrl.searchParams.set('name', name);
      if (email) successUrl.searchParams.set('email', email);

      // First, validate the payment element
      const { error: submitError } = await elements.submit();
      if (submitError) {
        console.error('Error submitting payment element:', submitError);
        setErrorMessage(submitError.message || 'Please check your card details.');
        setIsProcessing(false);
        return;
      }

      // Then confirm the payment
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: successUrl.toString(),
          payment_method_data: {
            billing_details: {
              name: name || undefined,
              email: email || undefined,
            },
          },
        },
      });

      // Only handle immediate errors here
      // Successful payments will redirect to the return_url
      if (error) {
        console.error('Payment confirmation error:', error);
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setErrorMessage(error.message || 'Payment failed. Please try again.');
        } else {
          setErrorMessage('An unexpected error occurred. Please try again.');
        }
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setErrorMessage('An error occurred while processing your payment. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payment Details</h2>
        <div className="text-lg font-semibold">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR',
          }).format(price / 100)}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <PaymentElement />

        {errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">{errorMessage}</p>
            <p className="mt-1 text-sm text-gray-600">
              Please check your payment details and try again.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={isProcessing}>
            Back
          </Button>
          <Button type="submit" disabled={!stripe || isProcessing}>
            {isProcessing ? 'Processing...' : 'Pay now'}
          </Button>
        </div>
      </form>
    </div>
  );
}
