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
};

export function PaymentStep({ price, onBack }: PaymentStepProps) {
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
      // First submit the payment details
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message ?? "An error occurred");
        setIsProcessing(false);
        return;
      }

      // Then confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}${window.location.pathname}/payment-processing`,
        },
        redirect: "if_required",
      });

      if (error) {
        // Payment failed - show error and let user try again
        setErrorMessage(error.message || "Payment failed. Please try again.");
        setIsProcessing(false);
      } else if (paymentIntent.status === "succeeded") {
        // Payment succeeded - redirect to processing page
        window.location.href = `${window.location.pathname}/payment-processing?startTime=${new URLSearchParams(window.location.search).get("startTime")}`;
      }
    } catch (error) {
      console.error("Payment error:", error);
      setErrorMessage(
        "An error occurred while processing your payment. Please try again."
      );
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
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{errorMessage}</p>
            <p className="text-sm text-gray-600 mt-1">
              Please check your payment details and try again.
            </p>
          </div>
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
