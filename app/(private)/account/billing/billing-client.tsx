"use client";

import React from "react";
import { Button } from "@/components/atoms/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { handleConnectStripe } from "@/server/actions/billing";

interface BillingPageClientProps {
  userId: string;
  dbUser: {
    stripeConnectAccountId: string | null;
  };
  accountStatus: {
    detailsSubmitted?: boolean;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  } | null;
}

export function BillingPageClient({
  userId,
  dbUser,
  accountStatus,
}: BillingPageClientProps) {
  return (
    <div className="container mx-auto py-10">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Expert Payment Settings</CardTitle>
            <CardDescription>
              Connect your Stripe account to receive payments for your expert
              services. Eleva takes a 15% service fee, and the remaining 85%
              will be transferred directly to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dbUser.stripeConnectAccountId ? (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-2">Account Status</h4>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center justify-between">
                      Account Setup:
                      <span
                        className={
                          accountStatus?.detailsSubmitted
                            ? "text-green-600"
                            : "text-yellow-600"
                        }
                      >
                        {accountStatus?.detailsSubmitted
                          ? "Complete"
                          : "Incomplete"}
                      </span>
                    </p>
                    <p className="flex items-center justify-between">
                      Payments Enabled:
                      <span
                        className={
                          accountStatus?.chargesEnabled
                            ? "text-green-600"
                            : "text-yellow-600"
                        }
                      >
                        {accountStatus?.chargesEnabled ? "Yes" : "No"}
                      </span>
                    </p>
                    <p className="flex items-center justify-between">
                      Payouts Enabled:
                      <span
                        className={
                          accountStatus?.payoutsEnabled
                            ? "text-green-600"
                            : "text-yellow-600"
                        }
                      >
                        {accountStatus?.payoutsEnabled ? "Yes" : "No"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button asChild className="flex-1">
                    <a
                      href={`https://connect.stripe.com/express/${dbUser.stripeConnectAccountId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Stripe Dashboard
                    </a>
                  </Button>
                  {!accountStatus?.detailsSubmitted && (
                    <Button asChild variant="secondary" className="flex-1">
                      <a
                        href={`https://connect.stripe.com/express/onboarding/${dbUser.stripeConnectAccountId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Complete Onboarding
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t connected your Stripe account yet. Connect
                  now to start receiving payments.
                </p>
                <form action={() => handleConnectStripe(userId)}>
                  <Button type="submit" className="w-full">
                    Connect with Stripe
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
            <CardDescription>
              Learn about payment processing and payout schedules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm">
                <h4 className="font-medium mb-2">Payment Breakdown</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Your earnings: 85% of the booking amount</li>
                  <li>Platform fee: 15% of the booking amount</li>
                </ul>
              </div>
              <div className="text-sm">
                <h4 className="font-medium mb-2">Payout Schedule</h4>
                <p>
                  Once your Stripe account is connected and verified,
                  you&apos;ll receive payouts automatically according to your
                  country&apos;s standard payout schedule. Most countries
                  receive payouts within 2 business days.
                </p>
              </div>
              <div className="text-sm">
                <h4 className="font-medium mb-2">Requirements</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Valid bank account in your country</li>
                  <li>Government-issued ID or passport</li>
                  <li>Proof of address (may be required)</li>
                  <li>Additional documentation based on your location</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
