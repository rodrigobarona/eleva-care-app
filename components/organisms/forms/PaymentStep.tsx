import type React from "react";
import { useState } from "react";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/atoms/button";

type PaymentStepProps = {
  price: number;
  onBack: () => void;
  onSuccess: () => void;
};

export function PaymentStep({ price, onBack, onSuccess }: PaymentStepProps) {
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
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Make sure to change this to your payment completion page
          return_url: `${window.location.origin}${window.location.pathname}/payment-processing`,
        },
        redirect: "if_required",
      });

      if (error) {
        // Handle specific error cases
        if (error.type === "card_error" || error.type === "validation_error") {
          setErrorMessage(
            error.message || "An error occurred with your payment"
          );
        } else {
          setErrorMessage("An unexpected error occurred");
        }
        setIsProcessing(false);
        return;
      }

      // Check PaymentIntent status
      if (paymentIntent && paymentIntent.status === "succeeded") {
        // Payment successful without 3D Secure
        onSuccess();
      } else if (paymentIntent?.next_action && paymentIntent.client_secret) {
        // 3D Secure is required - handle redirect
        const { error: redirectError } = await stripe.handleNextAction({
          clientSecret: paymentIntent.client_secret,
        });

        if (redirectError) {
          setErrorMessage(
            redirectError.message || "Payment authentication failed"
          );
          setIsProcessing(false);
          return;
        }
      } else {
        // Redirect to processing page to wait for webhook
        onSuccess();
      }
    } catch (err) {
      console.error("Payment error:", err);
      setErrorMessage("An error occurred while processing your payment");
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Payment Details</h2>
        <div className="text-lg font-semibold">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "EUR",
          }).format(price / 100)}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <PaymentElement />

        {errorMessage && (
          <div className="mt-4 text-red-600 text-sm">{errorMessage}</div>
        )}

        <div className="mt-6 flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isProcessing}
          >
            Back
          </Button>
          <Button type="submit" disabled={!stripe || isProcessing}>
            {isProcessing ? "Processing..." : "Pay now"}
          </Button>
        </div>
      </form>
    </div>
  );
}
