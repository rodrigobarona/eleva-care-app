import { STRIPE_CONFIG } from '@/config/stripe';
import { auth, currentUser } from '@clerk/nextjs/server';
import { Redis } from '@upstash/redis';
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

// Initialize Redis client
const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_READ_ONLY_TOKEN || '',
});

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

/**
 * GET handler for checking if a user's KV data is in sync with Stripe
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

    // Get user data from Upstash Redis
    const kvUser = await redis.get<StripeCustomerData>(`user:${userId}`);

    // Get the user's primary email
    const primaryEmail = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId,
    )?.emailAddress;

    // Check if basic user data exists in KV and matches Clerk data
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    const basicDataInSync =
      kvUser &&
      primaryEmail &&
      kvUser.email === primaryEmail &&
      kvUser.name === fullName &&
      kvUser.userId === userId;

    // Check if Stripe data is in sync
    let stripeDataInSync = true;

    if (kvUser?.stripeCustomerId) {
      try {
        // Check if customer exists in Stripe
        const customer = await stripe.customers.retrieve(kvUser.stripeCustomerId);

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
          if (!Array.isArray(kvUser.subscriptions)) {
            stripeDataInSync = false;
          }

          // Check other fields exist
          if (typeof kvUser.created !== 'number' || typeof kvUser.updatedAt !== 'number') {
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
    });
  } catch (error) {
    console.error('Error checking KV sync:', error);
    return NextResponse.json({ error: 'Failed to check KV synchronization' }, { status: 500 });
  }
}
