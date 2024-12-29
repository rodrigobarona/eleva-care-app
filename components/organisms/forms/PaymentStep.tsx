"use client";

import type React from "react";
import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/atoms/button";
import { formatCurrency } from "@/lib/formatters";

type PaymentStepProps = {
  price: number;
  onBack: () => void;
};

export function PaymentStep({ price, onBack }: PaymentStepProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // This is where we confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}${window.location.pathname}/success`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
      } else if (paymentIntent.status === "succeeded") {
        // Payment successful, redirect to success page
        window.location.href = `${window.location.pathname}/success`;
      }
    } catch (error) {
      console.error("Payment error:", error);
      setErrorMessage("An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Payment Details</h2>
        <p className="text-muted-foreground">
          Total amount: {formatCurrency(price)}
        </p>
      </div>

      <PaymentElement />

      {errorMessage && (
        <div className="mt-4 text-red-500 text-sm">{errorMessage}</div>
      )}

      <div className="flex gap-2 justify-end mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isProcessing}
        >
          Back
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing}>
          {isProcessing ? "Processing..." : "Pay Now"}
        </Button>
      </div>
    </form>
  );
}
