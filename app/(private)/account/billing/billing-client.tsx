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

      // First ensure KV data is in sync
      try {
        console.log('Checking KV sync status before Connect setup');
        const checkResponse = await fetch('/api/user/check-kv-sync', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const checkData = await checkResponse.json();

        // Rebuild if not in sync
        if (!checkData.isInSync) {
          console.log('KV data not in sync, rebuilding before Connect setup...');
          await fetch('/api/user/rebuild-kv', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          console.log('KV data rebuilt successfully');
        }
      } catch (error) {
        console.error('Error checking KV sync:', error);
        // Continue with the process even if KV sync fails
      }

      // Implement a retry mechanism for identity verification check
      const maxVerificationRetries = 3;
      let verificationData = null;
      let verificationError = null;

      for (let attempt = 1; attempt <= maxVerificationRetries; attempt++) {
        try {
          console.log(
            `Checking identity verification (attempt ${attempt}/${maxVerificationRetries})`,
          );
          const verificationResponse = await fetch('/api/stripe/identity/verification/status');

          // If response not OK, throw error to retry
          if (!verificationResponse.ok) {
            const errorData = await verificationResponse.json();
            throw new Error(errorData.error || 'Verification status check failed');
          }

          verificationData = await verificationResponse.json();
          console.log('Verification status:', verificationData);

          // Break the loop if we got valid data
          break;
        } catch (error) {
          console.error(`Verification check attempt ${attempt} failed:`, error);
          verificationError = error;

          // If not the last attempt, wait with exponential backoff
          if (attempt < maxVerificationRetries) {
            const delayMs = 2 ** attempt * 500; // 1s, 2s, 4s backoff
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }

      // If all verification checks failed, show error and redirect
      if (!verificationData) {
        console.error('All verification check attempts failed:', verificationError);
        toast.error('Verification status check failed', {
          description: 'Unable to verify your identity status. Redirecting to verification.',
        });
        setIsConnecting(false);
        window.location.href = '/account/identity';
        return;
      }

      // Check verification status from the data we received
      if (!verificationData.verified) {
        toast.info('Identity verification required', {
          description: 'You need to verify your identity before setting up payments.',
        });
        setIsConnecting(false);
        window.location.href = '/account/identity';
        return;
      }

      // At this point we know the user is verified
      // Let's sync the identity verification to the Connect account first
      try {
        const syncResult = await syncIdentityToConnect();
        if (!syncResult.success) {
          console.warn('Identity sync warning:', syncResult.message);
          // Don't block the flow, but log the warning
          toast.info('Preparing your account', {
            description: 'This may take a moment to sync all your information.',
          });

          // Add a short delay to give the sync operation time to complete in the background
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } else {
          console.log('Identity sync successful:', syncResult.message);
        }
      } catch (error) {
        console.error('Error during identity sync:', error);
        // Continue with the process even if sync fails
      }

      // Fetch user data for Connect account creation
      console.log('Fetching user data for Connect account creation');
      const userResponse = await fetch('/api/user/profile');
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await userResponse.json();
      const email = userData.user?.email;

      // Validate country from user data using the supported countries list
      const rawCountry = userData.user?.country || 'PT';

      // Implement Connect account creation with retry mechanism
      const maxConnectRetries = 3;
      let connectSuccess = false;
      let connectData = null;
      let lastError = null;

      for (let attempt = 1; attempt <= maxConnectRetries; attempt++) {
        try {
          console.log(`Creating Connect account (attempt ${attempt}/${maxConnectRetries})`);

          const response = await fetch('/api/stripe/connect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, country: rawCountry }),
          });

          if (!response.ok) {
            const errorData = await response.json();

            // Special handling for country not supported errors
            if (errorData.error === 'Country not supported') {
              console.warn('Country not supported:', errorData);

              // Show a more detailed error message with suggested country
              toast.error('Country not supported', {
                description: `${errorData.message} We recommend using ${errorData.suggestedCountry} instead.`,
              });

              // Ask if they want to try with the suggested country instead
              if (
                confirm(
                  `Your country "${rawCountry}" is not supported by Stripe. Would you like to try with ${errorData.suggestedCountry} instead?`,
                )
              ) {
                console.log(`Retrying with suggested country: ${errorData.suggestedCountry}`);

                // Try again with the suggested country
                const retryResponse = await fetch('/api/stripe/connect', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ email, country: errorData.suggestedCountry }),
                });

                if (!retryResponse.ok) {
                  const retryErrorData = await retryResponse.json();
                  throw new Error(retryErrorData.error || 'Connect account creation failed');
                }

                connectData = await retryResponse.json();
                connectSuccess = true;
                break;
              }

              // User declined to use suggested country
              throw new Error('Connect account creation canceled - country not supported');
            }

            throw new Error(errorData.error || 'Connect account creation failed');
          }

          connectData = await response.json();

          if (connectData.error) {
            throw new Error(connectData.error);
          }

          connectSuccess = true;
          break;
        } catch (error) {
          console.error(`Connect account creation attempt ${attempt} failed:`, error);
          lastError = error;

          // If not the last attempt, wait with exponential backoff
          if (attempt < maxConnectRetries) {
            const delayMs = 2 ** attempt * 1000; // 2s, 4s, 8s backoff
            toast.info(`Setting up your account (attempt ${attempt})`, {
              description: 'Please wait a moment...',
            });
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }

      // If all attempts failed, show error
      if (!connectSuccess) {
        const errorMessage =
          lastError instanceof Error
            ? lastError.message
            : 'Failed to connect to Stripe after multiple attempts';
        throw new Error(errorMessage);
      }

      // Successful connection, redirect to Stripe
      if (connectData.url) {
        window.location.href = connectData.url;
      } else {
        throw new Error('No URL returned from Stripe Connect');
      }
    } catch (error) {
      console.error('Failed to connect Stripe:', error);
      toast.error('Failed to connect to Stripe', {
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
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
