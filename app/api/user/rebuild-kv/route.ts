import { STRIPE_CONFIG } from '@/config/stripe';
import { syncStripeDataToKV } from '@/lib/integrations/stripe';
import { ensureFullUserSynchronization } from '@/server/actions/user-sync';
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

/**
 * POST handler for rebuilding a user's KV data
 * This forces a full resync of the user's data with Stripe and Redis
 */
export async function POST() {
  try {
    // Get current user
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('Rebuilding KV data for user:', {
      userId,
      email: user.emailAddresses[0]?.emailAddress,
    });

    // 1. Ensure user is fully synchronized with all systems
    const syncedUser = await ensureFullUserSynchronization(userId);

    if (!syncedUser) {
      return NextResponse.json({ error: 'Failed to synchronize user data' }, { status: 500 });
    }

    // 2. If user has a Stripe customer ID, sync it to KV
    if (syncedUser.stripeCustomerId) {
      console.log('Syncing Stripe customer data to KV:', syncedUser.stripeCustomerId);

      // Check if customer exists in Stripe
      try {
        const customer = await stripe.customers.retrieve(syncedUser.stripeCustomerId);

        // If customer exists, ensure name is set correctly
        if (!('deleted' in customer)) {
          // Get full name from current user data
          const firstName = user.firstName || '';
          const lastName = user.lastName || '';
          const fullName = [firstName, lastName].filter(Boolean).join(' ');

          // Update customer name in Stripe if needed
          if (fullName && fullName.trim() !== '' && customer.name !== fullName) {
            console.log('Updating customer name in Stripe:', {
              customerId: customer.id,
              oldName: customer.name,
              newName: fullName,
            });

            await stripe.customers.update(customer.id, {
              name: fullName,
              metadata: {
                ...customer.metadata,
                name: fullName,
              },
            });
          }
        }
      } catch (error) {
        console.error('Error checking/updating Stripe customer:', error);
      }

      // Sync to KV regardless of updates
      await syncStripeDataToKV(syncedUser.stripeCustomerId);
    } else {
      console.log('User has no Stripe customer ID, nothing to sync to KV');
    }

    return NextResponse.json({
      success: true,
      message: 'KV data rebuilt successfully',
    });
  } catch (error) {
    console.error('Error rebuilding KV data:', error);
    return NextResponse.json({ error: 'Failed to rebuild KV data' }, { status: 500 });
  }
}
