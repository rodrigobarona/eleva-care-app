'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/atoms/alert';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { getMinimumPayoutDelay } from '@/config/stripe';
import { Link } from '@/lib/i18n/navigation';
import { syncIdentityToConnect } from '@/server/actions/billing';
import { FileText, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('account.billing');
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [isSyncingIdentity, setIsSyncingIdentity] = useState(false);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<boolean>(false);

  // Fetch user profile data when component mounts
  React.useEffect(() => {
    async function fetchUserProfile() {
      try {
        setProfileError(false);
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          if (data.user?.country) {
            setUserCountry(data.user.country);
          }
        } else {
          throw new Error('Failed to load profile data');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setProfileError(true);
        toast.error('Failed to load country information', {
          description: 'Payment timing details may be inaccurate. Please refresh to try again.',
        });
      }
    }

    fetchUserProfile();
  }, []);

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

  // Get country-specific payout delay with safe fallback
  const getPayoutDelay = (country: string | null) => {
    if (!country) return getMinimumPayoutDelay('DEFAULT');
    return getMinimumPayoutDelay(country);
  };

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

  // Payment aging information component - extracted for future internationalization
  const PaymentAgingInformation = () => {
    const payoutDelay = getPayoutDelay(userCountry);
    const country = userCountry || 'your country';

    return (
      <>
        <h4 className="mb-2 font-medium">Payout Schedule</h4>
        {profileError && (
          <Alert variant="default" className="mb-3">
            <Info className="h-4 w-4" />
            <AlertTitle>Country information unavailable</AlertTitle>
            <AlertDescription>
              We couldn&apos;t determine your country. Payout information shown may be using default
              values.
            </AlertDescription>
          </Alert>
        )}
        <p>
          For session payments, you&apos;ll receive your funds typically within 1-2 days after your
          session is completed, depending on when the booking was made and your location.
        </p>
        <div className="my-3 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
          <h5 className="font-medium">How our payment aging system works:</h5>
          <ol className="ml-4 mt-1 list-decimal">
            <li>
              When a client books and pays for your session, that payment starts &quot;aging&quot;
              immediately
            </li>
            <li>
              Stripe requires payments to age for {payoutDelay} days in {country} before payout
            </li>
            <li>
              If a session is booked well in advance, the payment will already meet the aging
              requirement when your session occurs
            </li>
            <li>
              In this case, you&apos;ll receive funds just one day after completing your session
            </li>
            <li>
              For last-minute bookings, you&apos;ll need to wait for the remaining required days
              after your session
            </li>
          </ol>
        </div>
        <div className="my-3 bg-gray-50 p-3 text-sm">
          <h5 className="font-medium">Example:</h5>
          <p className="mt-1">
            For a {country} account (requiring {payoutDelay} days), if a client:
          </p>
          <ul className="ml-4 mt-1 list-disc">
            <li>Books and pays 10 days before the session → Get paid 1 day after session</li>
            <li>
              Books and pays 3 days before the session → Get paid {Math.max(1, payoutDelay - 3)}{' '}
              days after session
            </li>
            <li>
              Books and pays the same day as the session → Get paid {payoutDelay} days after session
            </li>
          </ul>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Note: You&apos;ll receive notifications about upcoming payouts in your Notifications
          center. After establishing a history with Stripe, you may be eligible for faster payouts.
        </p>
      </>
    );
  };

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
            <CardTitle>{t('subtitle')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
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
                {/* Legal Disclaimer */}
                <Alert className="border-blue-200 bg-blue-50">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-900">Payment Terms</AlertTitle>
                  <AlertDescription className="text-blue-800">
                    {t('legalDisclaimer')}{' '}
                    <Link
                      href="/legal/payment-policies"
                      className="font-medium underline hover:text-blue-900"
                    >
                      {t('paymentPolicies')}
                    </Link>
                    . {t('learnMore')}
                  </AlertDescription>
                </Alert>
                <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
                  {isConnecting ? t('buttons.connecting') : t('buttons.connect')}
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
                <PaymentAgingInformation />
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
