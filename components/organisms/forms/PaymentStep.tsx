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
          return_url: `${window.location.origin}${window.location.pathname}/success`,
        },
        redirect: "if_required",
      });

      if (error) {
        console.error("Payment error:", error);
        setErrorMessage(error.message || "An error occurred with your payment");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        onSuccess();
      } else if (paymentIntent?.next_action) {
        window.location.href = `${window.location.pathname}/payment-processing?startTime=${form.getValues("startTime").toISOString()}`;
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
