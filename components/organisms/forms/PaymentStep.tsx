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
  const [error, setError] = useState<string>();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.href}/success`,
        },
      });

      if (submitError) {
        setError(submitError.message);
      }
    } catch (error) {
      console.error("Payment error:", error);
      setError("Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      <div className="flex gap-2 justify-end mt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" disabled={processing}>
          {processing ? "Processing..." : `Pay €${(price / 100).toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
}
