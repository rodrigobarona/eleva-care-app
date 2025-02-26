import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { EventTable, UserTable } from '@/drizzle/schema';
import { Redis } from '@upstash/redis';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

// Initialize Stripe with API version from config
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

// Initialize Redis with correct environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? '',
  token: process.env.KV_REST_API_TOKEN ?? '',
});

// Define consistent key prefixes for Redis
const REDIS_KEYS = {
  USER_TO_CUSTOMER: (userId: string) => `stripe:user:${userId}`,
  CUSTOMER: (customerId: string) => `stripe:customer:${customerId}`,
  CUSTOMER_BY_EMAIL: (email: string) => `stripe:customer:email:${email}`,
  SUBSCRIPTION: (subscriptionId: string) => `stripe:subscription:${subscriptionId}`,
};

// Enhanced type definitions for KV storage
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

// Add detailed Redis connection verification
async function verifyRedisConnection() {
  try {
    // Test both read and write operations
    const testKey = 'stripe:connection:test';
    const testValue = `test-${Date.now()}`;

    // Test write
    const writeResult = await redis.set(testKey, testValue);
    console.log('Redis write test result:', writeResult);

    // Test read
    const readResult = await redis.get(testKey);
    console.log('Redis read test result:', readResult);

    // Cleanup
    await redis.del(testKey);

    const success = writeResult === 'OK' && readResult === testValue;
    if (!success) {
      console.error('Redis connection test failed:', {
        writeResult,
        readResult,
      });
      return false;
    }

    console.log('Redis connection verified successfully');
    return true;
  } catch (error) {
    console.error('Redis connection verification failed:', error);
    return false;
  }
}

/**
 * Synchronizes Stripe customer data to KV store
 * This is the single source of truth for customer data
 */
export async function syncStripeDataToKV(
  stripeCustomerId: string,
): Promise<StripeCustomerData | null> {
  try {
    // Verify Redis connection first with detailed logging
    console.log('Verifying Redis connection before sync...');
    const isRedisConnected = await verifyRedisConnection();
    if (!isRedisConnected) {
      console.error('Redis connection verification failed, aborting sync');
      throw new Error('Redis connection failed');
    }
    console.log('Redis connection verified, proceeding with sync');

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

    console.log('Preparing to store customer data:', customerData);

    // Store in Redis with multiple access patterns for reliable lookup
    const storeOperations = [
      // Store by Stripe customer ID
      redis.set(REDIS_KEYS.CUSTOMER(customer.id), JSON.stringify(customerData)),
    ];

    // Store mapping from email to customer ID if email exists
    if (customer.email) {
      storeOperations.push(redis.set(REDIS_KEYS.CUSTOMER_BY_EMAIL(customer.email), customer.id));
    }

    // Store mapping from user ID to customer ID if exists
    if (customerData.userId) {
      storeOperations.push(
        redis.set(REDIS_KEYS.USER_TO_CUSTOMER(customerData.userId), customer.id),
      );
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

        storeOperations.push(
          redis.set(REDIS_KEYS.SUBSCRIPTION(subscription.id), JSON.stringify(subscriptionData)),
        );
      }
    }

    // Execute all Redis operations
    const results = await Promise.allSettled(storeOperations);

    // Check if any operations failed
    const failedOps = results.filter((result) => result.status === 'rejected');
    if (failedOps.length > 0) {
      console.error('Some Redis operations failed:', results);
      throw new Error('Failed to store customer data in Redis');
    }

    console.log('Successfully synced customer data to KV');
    return customerData;
  } catch (error) {
    console.error('Failed to sync Stripe data to KV:', error);
    throw error;
  }
}

/**
 * Gets an existing Stripe customer or creates a new one
 * Always uses KV as the source of truth with fallback to Stripe API
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
      const existingCustomerId = await redis.get<string>(REDIS_KEYS.USER_TO_CUSTOMER(userId));

      if (existingCustomerId) {
        console.log('Found existing customer ID in KV by userId:', existingCustomerId);

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
              await stripe.customers.update(existingCustomerId, { name });
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
      const existingCustomerId = await redis.get<string>(REDIS_KEYS.CUSTOMER_BY_EMAIL(email));

      if (existingCustomerId) {
        console.log('Found existing customer ID in KV by email:', existingCustomerId);

        // If we have userId but it wasn't linked, update the link
        if (userId) {
          await redis.set(REDIS_KEYS.USER_TO_CUSTOMER(userId), existingCustomerId);

          // Also update customer metadata and name in Stripe
          const customerData = await stripe.customers.retrieve(existingCustomerId);
          if ('metadata' in customerData && !customerData.deleted) {
            const updateParams: Stripe.CustomerUpdateParams = {
              metadata: {
                ...customerData.metadata,
                userId,
              },
            };

            // Update name if provided and different
            if (name && customerData.name !== name) {
              updateParams.name = name;
            }

            await stripe.customers.update(existingCustomerId, updateParams);
          }
        }

        // Sync latest data from Stripe
        await syncStripeDataToKV(existingCustomerId);
        return existingCustomerId;
      }

      // If still not found in KV, search directly in Stripe as fallback
      // This handles case where KV might have lost data
      console.log('No customer found in KV, searching Stripe directly by email');
      const existingCustomers = await stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        const existingCustomer = existingCustomers.data[0];
        console.log('Found existing Stripe customer by email:', existingCustomer.id);

        // Update customer with userId and name if provided and not already set
        const updateParams: Stripe.CustomerUpdateParams = {};

        if (
          userId &&
          (!existingCustomer.metadata?.userId || existingCustomer.metadata.userId !== userId)
        ) {
          updateParams.metadata = { ...existingCustomer.metadata, userId };
        }

        if (name && existingCustomer.name !== name) {
          updateParams.name = name;
        }

        if (Object.keys(updateParams).length > 0) {
          await stripe.customers.update(existingCustomer.id, updateParams);
        }

        // Sync to KV and return
        await syncStripeDataToKV(existingCustomer.id);
        return existingCustomer.id;
      }
    }

    // If no existing customer found, create a new one
    console.log('No existing customer found, creating new Stripe customer');
    const newCustomer = await stripe.customers.create({
      email: email || 'unknown@example.com', // Fallback for type safety
      name: name || undefined, // Only include if provided
      metadata: userId ? { userId } : {},
    });

    console.log('Created new Stripe customer:', newCustomer.id);

    // Sync the new customer to KV
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
    const event = await db.query.EventTable.findFirst({
      where: eq(EventTable.id, eventId),
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Get expert's Stripe Connect account
    const expert = await db.query.UserTable.findFirst({
      where: eq(UserTable.id, event.clerkUserId),
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
function getBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL environment variable is not set');
  }
  return baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
}

export async function createStripeConnectAccount(email: string, country: string) {
  try {
    const account = await stripe.accounts.create({
      type: 'standard',
      country,
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
    });

    return { accountId: account.id };
  } catch (error) {
    console.error('Error creating Connect account:', error);
    throw error;
  }
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

export async function getStripeConnectSetupOrLoginLink(accountId: string) {
  try {
    // First check the account status
    const account = await stripe.accounts.retrieve(accountId);
    const baseUrl = getBaseUrl();

    if (!account.details_submitted) {
      // If onboarding is not complete, create a new setup link
      const setupLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/account/billing?refresh=true`,
        return_url: `${baseUrl}/account/billing?success=true`,
        type: 'account_onboarding',
      });
      return setupLink.url;
    }

    // If onboarding is complete, create a login link
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  } catch (error) {
    console.error('Error creating Stripe Connect link:', error);
    throw error;
  }
}
