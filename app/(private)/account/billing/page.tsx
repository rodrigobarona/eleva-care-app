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
import { Loader2 } from "lucide-react";
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
