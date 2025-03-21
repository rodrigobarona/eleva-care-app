'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { syncIdentityToConnect } from '@/server/actions/billing';
import React, { Suspense, useState } from 'react';
import { toast } from 'sonner';

interface BillingPageClientProps {
  dbUser: {
    id: string;
    stripeConnectAccountId: string | null;
    stripeIdentityVerified: boolean;
  };
  accountStatus: {
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  } | null;
}

function BillingPageContent({ dbUser, accountStatus }: BillingPageClientProps) {
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [isSyncingIdentity, setIsSyncingIdentity] = useState(false);

  // Rebuild KV data when component mounts
  React.useEffect(() => {
    const checkAndRebuildKVData = async () => {
      try {
        setIsInitializing(true);
        console.log('Checking KV sync status');

        // First, check if KV data is in sync
        const checkResponse = await fetch('/api/user/check-kv-sync', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const checkData = await checkResponse.json();

        // Only rebuild if not in sync
        if (!checkData.isInSync) {
          console.log('KV data not in sync, rebuilding...');

          const rebuildResponse = await fetch('/api/user/rebuild-kv', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!rebuildResponse.ok) {
            const error = await rebuildResponse.json();
            console.error('Failed to rebuild KV data:', error);
          } else {
            console.log('KV data rebuilt successfully');
          }
        } else {
          console.log('KV data already in sync, skipping rebuild');
        }
      } catch (error) {
        console.error('Error checking or rebuilding KV data:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    checkAndRebuildKVData();
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);

      // First check if identity verification is required
      const verificationResponse = await fetch('/api/stripe/identity/status');
      const verificationData = await verificationResponse.json();

      if (!verificationData.verified) {
        // User needs to complete identity verification first
        toast.info('Identity verification required', {
          description: 'You need to verify your identity before setting up payments.',
        });
        setIsConnecting(false);
        window.location.href = '/account/identity';
        return;
      }

      // First, fetch the current user's data
      const userResponse = await fetch('/api/user/profile');
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await userResponse.json();
      const email = userData.user?.email;

      // Default to US if country is not available
      const country = userData.user?.country || 'PT';

      if (!email) {
        throw new Error('User email not found');
      }

      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, country }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        // For external Stripe URLs, we need to use window.location
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to connect Stripe:', error);
      toast.error('Failed to connect to Stripe. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDashboardClick = async () => {
    if (!dbUser.stripeConnectAccountId) return;
    try {
      setIsLoadingDashboard(true);
      const response = await fetch('/api/stripe/dashboard', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        // For external Stripe URLs, we need to use window.location
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to get dashboard URL:', error);
      toast.error('Failed to access Stripe dashboard. Please try again.');
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const handleSyncIdentity = async () => {
    try {
      setIsSyncingIdentity(true);
      const result = await syncIdentityToConnect();

      if (result.success) {
        toast.success(result.message);
        // Refresh the page to get updated account status
        window.location.reload();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to sync identity verification:', error);
      toast.error('Failed to sync identity verification. Please try again.');
    } finally {
      setIsSyncingIdentity(false);
    }
  };

  // Add this code where it makes sense in your UI, likely near the dashboard button
  const showSyncIdentityButton =
    dbUser.stripeIdentityVerified &&
    dbUser.stripeConnectAccountId &&
    (!accountStatus?.payoutsEnabled || !accountStatus?.chargesEnabled);

  return (
    <div className="container pb-16">
      <h1 className="mb-6 text-3xl font-bold">
        Billing
        {isInitializing && (
          <span className="ml-3 inline-flex items-center text-sm font-normal text-muted-foreground">
            <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Initializing...
          </span>
        )}
      </h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Expert Payment Settings</CardTitle>
            <CardDescription>
              Connect your Stripe account to receive payments for your expert services. Eleva takes
              a 15% service fee, and the remaining 85% will be transferred directly to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dbUser.stripeConnectAccountId ? (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h4 className="mb-2 font-medium">Account Status</h4>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center justify-between">
                      Account Setup:
                      <span
                        className={
                          accountStatus?.detailsSubmitted ? 'text-green-600' : 'text-yellow-600'
                        }
                      >
                        {accountStatus?.detailsSubmitted ? 'Complete' : 'Incomplete'}
                      </span>
                    </p>
                    <p className="flex items-center justify-between">
                      Payments Enabled:
                      <span
                        className={
                          accountStatus?.chargesEnabled ? 'text-green-600' : 'text-yellow-600'
                        }
                      >
                        {accountStatus?.chargesEnabled ? 'Yes' : 'No'}
                      </span>
                    </p>
                    <p className="flex items-center justify-between">
                      Payouts Enabled:
                      <span
                        className={
                          accountStatus?.payoutsEnabled ? 'text-green-600' : 'text-yellow-600'
                        }
                      >
                        {accountStatus?.payoutsEnabled ? 'Yes' : 'No'}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={handleDashboardClick}
                    className="flex-1"
                    disabled={isLoadingDashboard}
                  >
                    {isLoadingDashboard
                      ? 'Loading...'
                      : accountStatus?.detailsSubmitted
                        ? 'View Stripe Dashboard'
                        : 'Complete Stripe Setup'}
                  </Button>
                </div>
                {showSyncIdentityButton && (
                  <div className="mt-4 border-t pt-4">
                    <p className="mb-2 text-sm text-amber-600">
                      We noticed you&apos;ve verified your identity but your Stripe Connect account
                      may need additional verification.
                    </p>
                    <Button
                      onClick={handleSyncIdentity}
                      variant="outline"
                      className="w-full"
                      disabled={isSyncingIdentity}
                    >
                      {isSyncingIdentity ? 'Syncing...' : 'Sync Identity Verification'}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t connected your Stripe account yet. Connect now to start receiving
                  payments.
                </p>
                <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
                  {isConnecting ? 'Connecting...' : 'Connect with Stripe'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
            <CardDescription>Learn about payment processing and payout schedules.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm">
                <h4 className="mb-2 font-medium">Payment Breakdown</h4>
                <ul className="list-inside list-disc space-y-1">
                  <li>Your earnings: 85% of the booking amount</li>
                  <li>Platform fee: 15% of the booking amount</li>
                </ul>
              </div>
              <div className="text-sm">
                <h4 className="mb-2 font-medium">Payout Schedule</h4>
                <p>
                  For session payments, you&apos;ll receive your funds automatically on the day
                  after the session is completed. This delay ensures the session has been
                  successfully delivered before processing your payment.
                </p>
                <p className="mt-2">
                  Once transferred to your Stripe account, funds will follow your country&apos;s
                  standard payout schedule (typically within 2 business days).
                </p>
              </div>
              <div className="text-sm">
                <h4 className="mb-2 font-medium">Requirements</h4>
                <ul className="list-inside list-disc space-y-1">
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

export function BillingPageClient(props: BillingPageClientProps) {
  return (
    <Suspense
      fallback={<div className="container mx-auto py-10">Loading billing information...</div>}
    >
      <BillingPageContent {...props} />
    </Suspense>
  );
}
