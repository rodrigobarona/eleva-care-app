"use client";
import React from "react";
import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { Button } from "@/components/atoms/button";
import { Loader2, CreditCard, Plus } from "lucide-react"; // Removed PayPal as it is not exported
import { toast } from "sonner";

interface BillingInfo {
  subscription: {
    status: string;
    interval: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  invoices: {
    id: string;
    amount: number;
    status: string;
    date: string;
    invoice_pdf: string | null;
  }[];
  paymentMethods: {
    id: string;
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
  }[];
}

export default function BillingPage() {
  const { user, isLoaded } = useUser();
  const [billingInfo, setBillingInfo] = React.useState<BillingInfo | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchBillingInfo = async () => {
      try {
        const response = await fetch("/api/billing");
        const data = await response.json();
        setBillingInfo(data);
      } catch (err) {
        console.error("Failed to load billing information:", err);
        toast.error("Failed to load billing information");
      }
    };

    if (isLoaded && user) {
      fetchBillingInfo();
    }
  }, [isLoaded, user]);

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/billing/manage", {
        method: "POST",
      });
      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      console.error("Failed to open billing portal:", err);
      toast.error("Failed to open billing portal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/billing/payment-methods/add", {
        method: "POST",
      });
      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      console.error("Failed to add payment method:", err);
      toast.error("Failed to add payment method");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      await fetch(`/api/billing/payment-methods/${paymentMethodId}/default`, {
        method: "POST",
      });
      toast.success("Default payment method updated");
      // Refresh billing info
      const response = await fetch("/api/billing");
      const data = await response.json();
      setBillingInfo(data);
    } catch (err) {
      console.error("Failed to update default payment method:", err);
      toast.error("Failed to update default payment method");
    }
  };

  if (!isLoaded) return null;
  if (!user) return redirect("/sign-in");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Billing & Subscription</h3>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and billing information.
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Manage your subscription and billing preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingInfo?.subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {billingInfo.subscription.status === "active"
                      ? "Active Subscription"
                      : "Inactive Subscription"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Renews on{" "}
                    {new Date(
                      billingInfo.subscription.currentPeriodEnd
                    ).toLocaleDateString()}
                  </p>
                </div>
                <Button onClick={handleManageSubscription} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Please wait
                    </>
                  ) : (
                    "Manage Subscription"
                  )}
                </Button>
              </div>
              {billingInfo.subscription.cancelAtPeriodEnd && (
                <p className="text-sm text-destructive">
                  Your subscription will end on{" "}
                  {new Date(
                    billingInfo.subscription.currentPeriodEnd
                  ).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                You don&apos;t have an active subscription
              </p>
              <Button onClick={handleManageSubscription} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait
                  </>
                ) : (
                  "Subscribe Now"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Manage your payment methods and billing preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {billingInfo?.paymentMethods &&
            billingInfo.paymentMethods.length > 0 ? (
              <>
                {billingInfo.paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <CreditCard className="h-6 w-6" />
                      <div>
                        <p className="font-medium">
                          {method.brand} •••• {method.last4}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Expires {method.expiryMonth}/{method.expiryYear}
                        </p>
                      </div>
                    </div>
                    {!method.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefaultPaymentMethod(method.id)}
                      >
                        Make Default
                      </Button>
                    )}
                    {method.isDefault && (
                      <span className="text-sm text-muted-foreground">
                        Default
                      </span>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No payment methods added
              </p>
            )}
            <div className="mt-4">
              <Button
                onClick={handleAddPaymentMethod}
                disabled={isLoading}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View and download your previous invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingInfo?.invoices && billingInfo.invoices.length > 0 ? (
            <div className="space-y-4">
              {billingInfo.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      ${(invoice.amount / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(invoice.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-sm ${
                        invoice.status === "paid"
                          ? "text-green-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {invoice.status.charAt(0).toUpperCase() +
                        invoice.status.slice(1)}
                    </span>
                    {invoice.invoice_pdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(invoice.invoice_pdf || "", "_blank")
                        }
                      >
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No billing history available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
