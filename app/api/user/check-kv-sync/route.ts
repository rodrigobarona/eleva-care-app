import { STRIPE_CONFIG } from '@/config/stripe';
import { CustomerCache } from '@/lib/redis';
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Define the interface for Redis KV data structure
interface StripeCustomerData {
  stripeCustomerId: string;
  email: string;
  userId: string;
  name?: string | null;
  subscriptions?: string[];
  defaultPaymentMethod?: string | null;
  created: number;
  updatedAt: number;
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

/**
 * GET handler for checking if a user's KV data is in sync with Stripe
 * Uses unified CustomerCache instead of direct Redis client
 */
export async function GET() {
  try {
    // Get current user from Clerk
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('Checking KV sync status for user:', {
      userId,
      email: user.emailAddresses[0]?.emailAddress,
    });

    // Get customer ID from unified CustomerCache (first step)
    const customerId = await CustomerCache.getCustomerByUserId(userId);

    // Get the user's primary email
    const primaryEmail = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId,
    )?.emailAddress;

    // Check if basic user data exists in KV and matches Clerk data
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    // Get full customer data using the customer ID (second step)
    let customerData: StripeCustomerData | null = null;
    if (customerId) {
      try {
        // CustomerCache.getCustomer returns CachedCustomerData which matches StripeCustomerData structure
        const cachedData = await CustomerCache.getCustomer(customerId);
        if (cachedData) {
          // Convert CachedCustomerData to StripeCustomerData (they have compatible structures)
          customerData = {
            stripeCustomerId: cachedData.stripeCustomerId,
            email: cachedData.email,
            userId: cachedData.userId || userId,
            name: cachedData.name,
            subscriptions: cachedData.subscriptions || [],
            defaultPaymentMethod: cachedData.defaultPaymentMethod,
            created: cachedData.created,
            updatedAt: cachedData.updatedAt,
          };
        }
      } catch (error) {
        console.warn('Failed to retrieve customer data from cache:', error);
        customerData = null;
      }
    }

    const basicDataInSync =
      customerData &&
      primaryEmail &&
      customerData.email === primaryEmail &&
      customerData.name === fullName &&
      customerData.userId === userId;

    // Check if Stripe data is in sync
    let stripeDataInSync = true;

    if (customerData?.stripeCustomerId) {
      try {
        // Check if customer exists in Stripe
        const customer = await stripe.customers.retrieve(customerData.stripeCustomerId);

        if ('deleted' in customer) {
          // Customer was deleted in Stripe but exists in KV
          stripeDataInSync = false;
        } else {
          // Verify customer email in Stripe matches
          const stripeEmail = customer.email;
          if (stripeEmail !== primaryEmail) {
            stripeDataInSync = false;
          }

          // Check that subscriptions array exists
          if (!Array.isArray(customerData.subscriptions)) {
            stripeDataInSync = false;
          }

          // Check other fields exist
          if (
            typeof customerData.created !== 'number' ||
            typeof customerData.updatedAt !== 'number'
          ) {
            stripeDataInSync = false;
          }
        }
      } catch (error) {
        console.error('Error checking Stripe customer:', error);
        stripeDataInSync = false;
      }
    }

    return NextResponse.json({
      isInSync: basicDataInSync && stripeDataInSync,
      debug: {
        hasCustomerId: !!customerId,
        hasCustomerData: !!customerData,
        customerId: customerId,
        basicDataInSync,
        stripeDataInSync,
        cacheSource: 'unified_customer_cache',
        retrievalMethod: 'two_step_customer_lookup',
        userIdMapping: !!customerId,
        customerDataRetrieval: !!customerData,
      },
    });
  } catch (error) {
    console.error('Error checking KV sync:', error);
    return NextResponse.json({ error: 'Failed to check KV synchronization' }, { status: 500 });
  }
}
