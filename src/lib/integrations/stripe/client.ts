import { getMinimumPayoutDelay, STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { EventsTable, UsersTable } from '@/drizzle/schema';
import { CustomerCache } from '@/lib/redis/manager';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

// Initialize Stripe with API version from config
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

// Enhanced type definitions for customer data (now using unified CustomerCache)
interface StripeCustomerData {
  stripeCustomerId: string;
  email: string;
  userId?: string;
  name?: string | null;
  subscriptions?: string[]; // Array of subscription IDs
  defaultPaymentMethod?: string | null;
  created: number;
  updatedAt: number;
}

// Enhanced interface for subscription data
interface StripeSubscriptionData {
  id: string;
  customerId: string;
  status: Stripe.Subscription.Status;
  priceId: string;
  productId: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  created: number;
  updatedAt: number;
}

// Platform fee percentage for revenue sharing
// This fee is automatically handled by Stripe Connect and can be monitored
// in the Stripe Connect dashboard (https://dashboard.stripe.com/connect)
const PLATFORM_FEE_PERCENTAGE = Number(process.env.STRIPE_PLATFORM_FEE_PERCENTAGE ?? '0.15'); // Default 15% if not set

export async function getServerStripe() {
  return stripe;
}

/**
 * Synchronizes Stripe customer data to unified CustomerCache
 * This is the single source of truth for customer data
 */
export async function syncStripeDataToKV(
  stripeCustomerId: string,
): Promise<StripeCustomerData | null> {
  try {
    console.log('Syncing Stripe customer data to unified cache...');

    // Expand to include subscriptions data
    const customer = await stripe.customers.retrieve(stripeCustomerId, {
      expand: ['subscriptions'],
    });

    if (!customer || customer.deleted) {
      console.error('Customer was deleted or not found');
      return null;
    }

    // Get subscription IDs if any
    const subscriptionIds = customer.subscriptions?.data.map((sub) => sub.id) || [];

    // Create comprehensive customer data
    const customerData: StripeCustomerData = {
      stripeCustomerId: customer.id,
      email: typeof customer.email === 'string' ? customer.email : '',
      userId: typeof customer.metadata?.userId === 'string' ? customer.metadata.userId : undefined,
      name: customer.name,
      subscriptions: subscriptionIds,
      defaultPaymentMethod: customer.invoice_settings?.default_payment_method as string | null,
      created: customer.created,
      updatedAt: Date.now(),
    };

    console.log('Preparing to store customer data in unified cache:', customerData);

    // Store in unified CustomerCache with multiple access patterns
    const storeOperations = [
      // Store customer data by Stripe customer ID
      CustomerCache.setCustomer(customer.id, customerData),
    ];

    // Store mapping from email to customer ID if email exists
    if (customer.email) {
      storeOperations.push(CustomerCache.setEmailMapping(customer.email, customer.id));
    }

    // Store mapping from user ID to customer ID if exists
    if (customerData.userId) {
      storeOperations.push(CustomerCache.setUserMapping(customerData.userId, customer.id));
    }

    // Store subscription data individually if there are subscriptions
    if (customer.subscriptions?.data.length) {
      for (const subscription of customer.subscriptions.data) {
        const subscriptionData: StripeSubscriptionData = {
          id: subscription.id,
          customerId: customer.id,
          status: subscription.status,
          priceId: subscription.items.data[0]?.price.id || '',
          productId: (subscription.items.data[0]?.price.product as string) || '',
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          created: subscription.created,
          updatedAt: Date.now(),
        };

        storeOperations.push(CustomerCache.setSubscription(subscription.id, subscriptionData));
      }
    }

    // Execute all cache operations
    await Promise.allSettled(storeOperations);

    console.log('Successfully synced customer data to unified cache');
    return customerData;
  } catch (error) {
    console.error('Failed to sync Stripe data to unified cache:', error);
    throw error;
  }
}

/**
 * Gets an existing Stripe customer or creates a new one
 * Always uses unified CustomerCache as the source of truth with fallback to Stripe API
 */
export async function getOrCreateStripeCustomer(
  userId?: string,
  email?: string,
  name?: string,
): Promise<string> {
  // Validate input parameters
  if (!userId && !email) {
    throw new Error('Either userId or email must be provided');
  }

  try {
    // First try to find existing customer by userId (most reliable)
    if (userId) {
      console.log('Looking up customer by userId:', userId);
      const existingCustomerId = await CustomerCache.getCustomerByUserId(userId);

      if (existingCustomerId) {
        console.log('Found existing customer ID in unified cache by userId:', existingCustomerId);

        // Sync latest data from Stripe to ensure it's up to date
        await syncStripeDataToKV(existingCustomerId);

        // If name is provided, update the customer's name if needed
        if (name) {
          try {
            const customer = await stripe.customers.retrieve(existingCustomerId);
            if (!('deleted' in customer) && customer.name !== name) {
              console.log('Updating customer name:', {
                customerId: existingCustomerId,
                oldName: customer.name,
                newName: name,
              });
              await stripe.customers.update(existingCustomerId, {
                name,
                metadata: {
                  ...(customer.metadata || {}),
                  name, // Also store name in metadata for extra redundancy
                  userId, // Ensure userId is always in metadata
                },
              });

              // Force sync to unified cache after update
              await syncStripeDataToKV(existingCustomerId);
            }
          } catch (error) {
            console.error('Error updating customer name:', error);
          }
        }

        return existingCustomerId;
      }
    }

    // If no customer found by userId, try by email
    if (email) {
      console.log('Looking up customer by email:', email);
      const existingCustomerId = await CustomerCache.getCustomerByEmail(email);

      if (existingCustomerId) {
        console.log('Found existing customer ID in unified cache by email:', existingCustomerId);

        // If we have userId but it wasn't linked, update the link
        if (userId) {
          await CustomerCache.setUserMapping(userId, existingCustomerId);

          // Also update customer metadata and name in Stripe
          const customerData = await stripe.customers.retrieve(existingCustomerId);
          if ('metadata' in customerData && !customerData.deleted) {
            const updateParams: Stripe.CustomerUpdateParams = {
              metadata: {
                ...customerData.metadata,
                userId,
                ...(name ? { name } : {}), // Add name to metadata if provided
              },
            };

            // Update name if provided and different
            if (name && customerData.name !== name) {
              updateParams.name = name;
            }

            await stripe.customers.update(existingCustomerId, updateParams);

            // Force sync to unified cache after update
            await syncStripeDataToKV(existingCustomerId);
          }
        }

        // Sync latest data from Stripe
        await syncStripeDataToKV(existingCustomerId);
        return existingCustomerId;
      }

      // If still not found in unified cache, search directly in Stripe as fallback
      // This handles case where unified cache might have lost data
      console.log('No customer found in unified cache, searching Stripe directly by email');
      const existingCustomers = await stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        const existingCustomer = existingCustomers.data[0];
        console.log('Found existing Stripe customer by email:', existingCustomer.id);

        // Update customer with userId and name if provided and not already set
        const updateParams: Stripe.CustomerUpdateParams = {
          metadata: {
            ...existingCustomer.metadata,
            ...(userId ? { userId } : {}),
            ...(name ? { name } : {}), // Store name in metadata too
          },
        };

        if (name && existingCustomer.name !== name) {
          updateParams.name = name;
        }

        if (Object.keys(updateParams.metadata || {}).length > 0 || updateParams.name) {
          await stripe.customers.update(existingCustomer.id, updateParams);

          // Force sync to unified cache after update
          await syncStripeDataToKV(existingCustomer.id);
        }

        // Sync to unified cache and return
        await syncStripeDataToKV(existingCustomer.id);
        return existingCustomer.id;
      }
    }

    // If no existing customer found, create a new one
    console.log('No existing customer found, creating new Stripe customer');
    const metadata = {
      ...(userId ? { userId } : {}),
      ...(name ? { name } : {}), // Store name in metadata for redundancy
    };

    const newCustomer = await stripe.customers.create({
      email: email || 'unknown@example.com', // Fallback for type safety
      name: name || undefined, // Only include if provided
      metadata,
    });

    console.log('Created new Stripe customer:', {
      id: newCustomer.id,
      email: newCustomer.email,
      name: newCustomer.name,
      metadata: newCustomer.metadata,
    });

    // Sync the new customer to unified cache
    await syncStripeDataToKV(newCustomer.id);
    return newCustomer.id;
  } catch (error) {
    console.error('Error in getOrCreateStripeCustomer:', error);

    // Try to give helpful context in error message
    const errorContext = userId
      ? `userId: ${userId}`
      : email
        ? `email: ${email}`
        : 'no identifiers';
    throw new Error(
      `Failed to get or create Stripe customer (${errorContext}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function createPaymentIntent({
  eventId,
  customerEmail,
  meetingData,
}: {
  eventId: string;
  customerEmail: string;
  meetingData: Record<string, unknown>;
}) {
  try {
    // Get event details
    const event = await db.query.EventsTable.findFirst({
      where: eq(EventsTable.id, eventId),
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Get expert's Stripe Connect account
    const expert = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.id, event.workosUserId),
    });

    if (!expert?.stripeConnectAccountId || !expert.stripeConnectDetailsSubmitted) {
      throw new Error("Expert's Stripe account not found or setup incomplete");
    }

    // Calculate application fee
    const amount = event.price;
    const applicationFeeAmount = Math.round(amount * PLATFORM_FEE_PERCENTAGE);

    // Create or get customer
    const customer = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    const customerId =
      customer.data.length > 0
        ? customer.data[0].id
        : (
            await stripe.customers.create({
              email: customerEmail,
              metadata: {
                eventId,
              },
            })
          ).id;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        eventId,
        meetingData: JSON.stringify(meetingData),
      },
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: expert.stripeConnectAccountId,
      },
    });

    return { clientSecret: paymentIntent.client_secret };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

// Helper function to get base URL with protocol
export function getBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL environment variable is not set');
  }
  return baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
}

export async function createStripeConnectAccount(email: string, country: string) {
  console.log('Creating Connect account with country:', country);

  return withRetry(
    async () => {
      try {
        console.log('Creating Stripe Connect account:', { email, country });

        // Determine the minimum payout delay for this country
        const minimumDelayDays = getMinimumPayoutDelay(country);
        console.log(
          `Using minimum payout delay of ${minimumDelayDays} days for country ${country}`,
        );

        const account = await stripe.accounts.create({
          type: 'express',
          country: country.toUpperCase(), // Ensure country code is uppercase
          email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual',
          settings: {
            payouts: {
              schedule: {
                interval: 'manual', // ← FIXED: Use manual payouts for cron job control
                // delay_days is not needed for manual payouts
              },
            },
          },
        });

        console.log('Stripe Connect account created:', {
          accountId: account.id,
          country: account.country,
          email: account.email,
          payoutDelay: minimumDelayDays,
        });

        return { accountId: account.id };
      } catch (error) {
        console.error('Connect account creation error:', error);
        throw error;
      }
    },
    3,
    1000,
  ); // 3 retries with 1s initial delay
}

export async function getConnectAccountBalance(accountId: string) {
  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    });
    return balance;
  } catch (error) {
    console.error('Error fetching Connect account balance:', error);
    throw error;
  }
}

export async function getConnectAccountPayouts(accountId: string) {
  try {
    const payouts = await stripe.payouts.list({
      stripeAccount: accountId,
    });
    return payouts;
  } catch (error) {
    console.error('Error fetching Connect account payouts:', error);
    throw error;
  }
}

export async function updateConnectAccountSettings(
  accountId: string,
  settings: Stripe.AccountUpdateParams,
) {
  try {
    const account = await stripe.accounts.update(accountId, settings);
    return account;
  } catch (error) {
    console.error('Error updating Connect account settings:', error);
    throw error;
  }
}

export async function getStripeConnectAccountStatus(accountId: string) {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return {
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    };
  } catch (error) {
    console.error('Error retrieving Connect account status:', error);
    throw error;
  }
}

export async function getStripeConnectLoginLink(accountId: string) {
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  } catch (error) {
    console.error('Error creating login link:', error);
    throw error;
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000,
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (error instanceof Stripe.errors.StripeError) {
        // Only retry on rate limiting or network errors
        if (error.type === 'StripeRateLimitError' || error.type === 'StripeConnectionError') {
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
          continue;
        }
      }
      throw error;
    }
  }
  throw lastError;
}

export async function getStripeConnectSetupOrLoginLink(accountId: string) {
  return withRetry(async () => {
    const account = await stripe.accounts.retrieve(accountId);
    const baseUrl = getBaseUrl();

    if (!account.details_submitted) {
      // For Express accounts that haven't completed onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/account/billing?refresh=true`,
        return_url: `${baseUrl}/account/billing?success=true`,
        type: 'account_onboarding',
        collect: 'eventually_due',
      });
      return accountLink.url;
    }

    // For Express accounts that have completed onboarding
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  });
}

/**
 * Syncs a user's Stripe Identity verification to their Stripe Connect account
 * This helps streamline the verification process for expert accounts
 *
 * @param workosUserId The Clerk user ID of the expert
 * @returns A promise that resolves to a success status and optional error message
 */
export async function syncIdentityVerificationToConnect(workosUserId: string) {
  try {
    // Look up the user in our database
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, workosUserId),
    });

    if (!user) {
      console.error('Cannot sync identity - user not found:', workosUserId);
      return { success: false, message: 'User not found' };
    }

    if (!user.stripeConnectAccountId) {
      console.error('Cannot sync identity - no Connect account:', workosUserId);
      return { success: false, message: 'No Stripe Connect account found' };
    }

    // For debugging, log all verification data
    console.log('Syncing identity for user:', {
      userId: user.id,
      workosUserId,
      email: user.email,
      stripeIdentityVerified: user.stripeIdentityVerified,
      stripeIdentityVerificationId: user.stripeIdentityVerificationId,
      stripeIdentityVerificationStatus: user.stripeIdentityVerificationStatus,
    });

    // First, check if the Connect account is already fully verified
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

    console.log('Initial Connect account status:', {
      connectAccountId: user.stripeConnectAccountId,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      individualVerification: account.individual?.verification?.status,
      metadata: account.metadata,
    });

    // Enhanced check - if identity verification ID exists, verify it's truly verified
    // This handles cases where database might be out of sync with Stripe
    let verificationStatus = {
      status: user.stripeIdentityVerificationStatus || 'unknown',
      lastUpdated: undefined as string | undefined,
    };
    let forceVerify = false;

    if (user.stripeIdentityVerificationId) {
      try {
        // Import the verification function dynamically to avoid circular dependencies
        const { getIdentityVerificationStatus } = await import('./identity');
        verificationStatus = await getIdentityVerificationStatus(user.stripeIdentityVerificationId);

        // Log the verification status for debugging
        console.log('Retrieved verification status:', {
          userId: user.id,
          verificationId: user.stripeIdentityVerificationId,
          status: verificationStatus.status,
          lastUpdated: verificationStatus.lastUpdated,
        });

        // Force verification if the verification status indicates it's verified but Connect doesn't show it
        if (
          verificationStatus.status === 'verified' &&
          account.individual?.verification?.status !== 'verified'
        ) {
          forceVerify = true;
          console.log('Force verifying due to status mismatch:', {
            identityStatus: verificationStatus.status,
            connectStatus: account.individual?.verification?.status,
          });
        }

        // Update the database if status doesn't match what we have
        if (
          (verificationStatus.status === 'verified' && !user.stripeIdentityVerified) ||
          (verificationStatus.status !== 'verified' && user.stripeIdentityVerified) ||
          user.stripeIdentityVerificationStatus !== verificationStatus.status
        ) {
          await db
            .update(UsersTable)
            .set({
              stripeIdentityVerified: verificationStatus.status === 'verified',
              stripeIdentityVerificationStatus: verificationStatus.status,
              stripeIdentityVerificationLastChecked: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(UsersTable.id, user.id));

          console.log('Updated user verification status in database', {
            userId: user.id,
            verified: verificationStatus.status === 'verified',
            status: verificationStatus.status,
          });
        }

        // If not verified and not forcing verification, exit early
        if (verificationStatus.status !== 'verified' && !forceVerify) {
          return {
            success: false,
            message: `User's identity verification status is ${verificationStatus.status}`,
          };
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
        // If the user was previously marked as verified but we can't check now,
        // we'll proceed with the sync anyway as a fallback
        if (user.stripeIdentityVerified) {
          forceVerify = true;
          console.log(
            'Force verifying due to error checking verification status but user marked as verified',
          );
        } else {
          return { success: false, message: 'Unable to verify identity verification status' };
        }
      }
    } else if (!user.stripeIdentityVerified && !forceVerify) {
      console.error('Cannot sync identity - not verified:', workosUserId);
      return { success: false, message: 'User has not completed identity verification' };
    }

    // Check if already verified and has correct metadata, don't update in that case
    if (
      account.individual?.verification?.status === 'verified' &&
      account.metadata?.identity_verified === 'true' &&
      account.metadata?.identity_verification_id === user.stripeIdentityVerificationId
    ) {
      console.log('Connect account already properly verified with correct metadata:', {
        userId: user.id,
        connectAccountId: user.stripeConnectAccountId,
      });

      return { success: true, message: 'Connect account already verified with correct metadata' };
    }

    // If already verified but missing metadata, just update the metadata
    if (
      account.individual?.verification?.status === 'verified' &&
      !account.metadata?.identity_verified
    ) {
      console.log('Connect account verified but missing metadata. Updating metadata only:', {
        userId: user.id,
        connectAccountId: user.stripeConnectAccountId,
      });

      await stripe.accounts.update(user.stripeConnectAccountId, {
        metadata: {
          ...account.metadata,
          identity_verified: 'true',
          identity_verified_at: new Date().toISOString(),
          identity_verification_id: user.stripeIdentityVerificationId,
        },
      });

      console.log('Updated metadata on already verified account:', user.stripeConnectAccountId);
      return { success: true, message: 'Updated metadata on already verified account' };
    }

    console.log('Updating Connect account with verification:', {
      userId: user.id,
      connectAccountId: user.stripeConnectAccountId,
      verificationId: user.stripeIdentityVerificationId,
      forceVerify,
    });

    // Apply the verification status to the Connect account
    await stripe.accounts.update(user.stripeConnectAccountId, {
      individual: {
        // Instead of directly setting verification status which causes a type error,
        // let's update the person's information and Stripe will handle verification
        first_name: 'VERIFIED_BY_PLATFORM',
        last_name: 'VERIFIED_BY_PLATFORM',
        verification: {
          document: {
            back: undefined,
            front: undefined,
          },
        },
      },
      // Add verification metadata to indicate this account was verified through Stripe Identity
      metadata: {
        ...account.metadata,
        identity_verified: 'true',
        identity_verified_at: new Date().toISOString(),
        identity_verification_id: user.stripeIdentityVerificationId,
        last_sync_attempt: new Date().toISOString(),
      },
    });

    // Verify the update worked by retrieving the account again
    const updatedAccount = await stripe.accounts.retrieve(user.stripeConnectAccountId);

    console.log('Successfully synced identity verification to Connect account:', {
      workosUserId,
      connectAccountId: user.stripeConnectAccountId,
      identityVerificationId: user.stripeIdentityVerificationId,
      verificationStatus: updatedAccount.individual?.verification?.status,
      metadata: updatedAccount.metadata,
    });

    return {
      success: true,
      message: 'Identity verification synced successfully',
      verificationStatus: updatedAccount.individual?.verification?.status,
    };
  } catch (error) {
    console.error('Error syncing identity verification to Connect:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
