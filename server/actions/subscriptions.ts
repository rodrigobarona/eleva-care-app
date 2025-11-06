/**
 * Subscription Management Server Actions
 *
 * Handles all subscription-related operations:
 * - Creating new subscriptions (annual plans)
 * - Canceling subscriptions
 * - Updating subscription plans
 * - Fetching subscription status
 *
 * Integrates with:
 * - Stripe Subscriptions API
 * - Database (SubscriptionPlansTable)
 * - Audit logging
 */

'use server';

import { SUBSCRIPTION_PRICING } from '@/config/subscription-pricing';
import { db } from '@/drizzle/db';
import {
  SubscriptionEventsTable,
  SubscriptionPlansTable,
  UserOrgMembershipsTable,
  UsersTable,
} from '@/drizzle/schema-workos';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

/**
 * Subscription Management Server Actions
 *
 * Handles all subscription-related operations:
 * - Creating new subscriptions (annual plans)
 * - Canceling subscriptions
 * - Updating subscription plans
 * - Fetching subscription status
 *
 * Integrates with:
 * - Stripe Subscriptions API
 * - Database (SubscriptionPlansTable)
 * - Audit logging
 */

/**
 * Subscription Management Server Actions
 *
 * Handles all subscription-related operations:
 * - Creating new subscriptions (annual plans)
 * - Canceling subscriptions
 * - Updating subscription plans
 * - Fetching subscription status
 *
 * Integrates with:
 * - Stripe Subscriptions API
 * - Database (SubscriptionPlansTable)
 * - Audit logging
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// ============================================================================
// Types
// ============================================================================

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';

export interface SubscriptionInfo {
  id: string;
  planType: 'commission' | 'monthly' | 'annual';
  tierLevel: 'community' | 'top';
  billingInterval: 'month' | 'year' | null;
  status: SubscriptionStatus | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  monthlyFee: number | null;
  annualFee: number | null;
  commissionRate: number;
}

export interface CreateSubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  checkoutUrl?: string;
  error?: string;
}

// ============================================================================
// Get Subscription Status
// ============================================================================

/**
 * Get the current subscription status for a user
 *
 * @param workosUserId - The WorkOS user ID (optional, uses current user if not provided)
 * @returns Subscription information or null if no subscription exists
 */
export async function getSubscriptionStatus(
  workosUserId?: string,
): Promise<SubscriptionInfo | null> {
  try {
    let userId = workosUserId;

    if (!userId) {
      const { user } = await withAuth({ ensureSignedIn: true });
      userId = user.id;
    }

    // Get subscription from database
    const subscription = await db.query.SubscriptionPlansTable.findFirst({
      where: eq(SubscriptionPlansTable.workosUserId, userId),
    });

    if (!subscription) {
      // User has no subscription, default to commission-based
      // Determine tier based on role
      const userRecord = await db.query.UsersTable.findFirst({
        where: eq(UsersTable.workosUserId, userId),
        columns: { role: true },
      });

      const tierLevel =
        userRecord?.role === 'expert_top' || userRecord?.role === 'expert_lecturer'
          ? 'top'
          : 'community';

      const commissionRate =
        tierLevel === 'top'
          ? SUBSCRIPTION_PRICING.commission_based.top_expert.commissionRate
          : SUBSCRIPTION_PRICING.commission_based.community_expert.commissionRate;

      return {
        id: 'default',
        planType: 'commission',
        tierLevel,
        billingInterval: null,
        status: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: null,
        monthlyFee: null,
        annualFee: null,
        commissionRate,
      };
    }

    // If annual subscription, get latest info from Stripe
    let cancelAtPeriodEnd = false;
    let currentPeriodStart = subscription.subscriptionStartDate;
    let currentPeriodEnd = subscription.subscriptionEndDate;

    if (subscription.stripeSubscriptionId && subscription.planType === 'annual') {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId,
        );
        cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
        currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
        currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error);
      }
    }

    return {
      id: subscription.id,
      planType: subscription.planType,
      tierLevel: subscription.tierLevel,
      billingInterval: subscription.billingInterval,
      status: subscription.subscriptionStatus as SubscriptionStatus | null,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      monthlyFee: subscription.monthlyFee,
      annualFee: subscription.annualFee,
      commissionRate: subscription.commissionRate ? subscription.commissionRate / 10000 : 0,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return null;
  }
}

// ============================================================================
// Create Subscription
// ============================================================================

/**
 * Create a new annual subscription for an expert
 *
 * Creates a Stripe Checkout session and returns the URL for payment
 *
 * @param priceId - The Stripe price ID for the subscription
 * @param tierLevel - The expert tier level ('community' or 'top')
 * @returns Checkout URL or error
 */
export async function createSubscription(
  priceId: string,
  tierLevel: 'community' | 'top',
  billingInterval: 'month' | 'year' = 'year', // Default to annual for backward compatibility
): Promise<CreateSubscriptionResult> {
  try {
    const { user } = await withAuth({ ensureSignedIn: true });

    // Get user's Stripe customer ID
    const userRecord = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, user.id),
      columns: {
        stripeCustomerId: true,
        email: true,
      },
    });

    if (!userRecord) {
      return { success: false, error: 'User not found' };
    }

    // Get user's orgId from memberships table
    const membership = await db.query.UserOrgMembershipsTable.findFirst({
      where: eq(UserOrgMembershipsTable.workosUserId, user.id),
      columns: {
        orgId: true,
      },
    });

    if (!membership || !membership.orgId) {
      return { success: false, error: 'Organization not found for user' };
    }

    // Check if user already has an active subscription
    const existingSubscription = await db.query.SubscriptionPlansTable.findFirst({
      where: eq(SubscriptionPlansTable.workosUserId, user.id),
    });

    if (existingSubscription && existingSubscription.subscriptionStatus === 'active') {
      return { success: false, error: 'You already have an active subscription' };
    }

    // Create or get Stripe customer
    let customerId = userRecord.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userRecord.email,
        metadata: {
          workosUserId: user.id,
        },
      });
      customerId = customer.id;

      // Update user record with customer ID
      await db
        .update(UsersTable)
        .set({ stripeCustomerId: customerId })
        .where(eq(UsersTable.workosUserId, user.id));
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?canceled=true`,
      metadata: {
        workosUserId: user.id,
        tierLevel,
        priceId,
        billingInterval,
      },
      subscription_data: {
        metadata: {
          workosUserId: user.id,
          tierLevel,
          billingInterval,
        },
      },
    });

    // Log subscription creation initiated
    const planType = billingInterval === 'month' ? 'monthly' : 'annual';
    await db.insert(SubscriptionEventsTable).values({
      workosUserId: user.id,
      orgId: membership.orgId,
      subscriptionPlanId: existingSubscription?.id || null,
      eventType: 'plan_created',
      newPlanType: planType,
      newTierLevel: tierLevel,
      stripeEventId: null,
      reason: 'user_initiated',
      metadata: {
        priceId,
        checkoutSessionId: session.id,
      },
    });

    return {
      success: true,
      checkoutUrl: session.url || undefined,
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create subscription',
    };
  }
}

// ============================================================================
// Cancel Subscription
// ============================================================================

/**
 * Cancel a user's annual subscription
 *
 * Cancels at the end of the current billing period (not immediately)
 *
 * @param reason - Optional reason for cancellation
 * @returns Success status
 */
export async function cancelSubscription(reason?: string): Promise<CreateSubscriptionResult> {
  try {
    const { user } = await withAuth({ ensureSignedIn: true });

    // Get subscription from database
    const subscription = await db.query.SubscriptionPlansTable.findFirst({
      where: eq(SubscriptionPlansTable.workosUserId, user.id),
    });

    if (!subscription) {
      return { success: false, error: 'No subscription found' };
    }

    if (!subscription.stripeSubscriptionId) {
      return { success: false, error: 'No Stripe subscription to cancel' };
    }

    // Cancel subscription in Stripe (at period end)
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Log cancellation event
    await db.insert(SubscriptionEventsTable).values({
      workosUserId: user.id,
      orgId: subscription.orgId,
      subscriptionPlanId: subscription.id,
      eventType: 'subscription_canceled',
      previousPlanType: subscription.planType,
      previousTierLevel: subscription.tierLevel,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      reason: reason || 'user_requested',
    });

    return { success: true };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel subscription',
    };
  }
}

// ============================================================================
// Reactivate Subscription
// ============================================================================

/**
 * Reactivate a canceled subscription before the period ends
 */
export async function reactivateSubscription(): Promise<CreateSubscriptionResult> {
  try {
    const { user } = await withAuth({ ensureSignedIn: true });

    const subscription = await db.query.SubscriptionPlansTable.findFirst({
      where: eq(SubscriptionPlansTable.workosUserId, user.id),
    });

    if (!subscription?.stripeSubscriptionId) {
      return { success: false, error: 'No subscription found' };
    }

    // Remove cancellation in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Log reactivation
    await db.insert(SubscriptionEventsTable).values({
      workosUserId: user.id,
      orgId: subscription.orgId,
      subscriptionPlanId: subscription.id,
      eventType: 'subscription_renewed',
      newPlanType: subscription.planType,
      newTierLevel: subscription.tierLevel,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      reason: 'user_reactivated',
    });

    return { success: true };
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reactivate subscription',
    };
  }
}

// ============================================================================
// Get Commission Rate
// ============================================================================

/**
 * Get the current commission rate for a user based on their subscription
 *
 * @param workosUserId - The WorkOS user ID
 * @returns Commission rate as a decimal (e.g., 0.20 for 20%)
 */
export async function getCurrentCommissionRate(workosUserId: string): Promise<number> {
  try {
    const subscription = await getSubscriptionStatus(workosUserId);

    if (!subscription) {
      // Default to highest commission rate if no subscription found
      return SUBSCRIPTION_PRICING.commission_based.community_expert.commissionRate;
    }

    return subscription.commissionRate;
  } catch (error) {
    console.error('Error getting commission rate:', error);
    // Return default commission rate on error
    return SUBSCRIPTION_PRICING.commission_based.community_expert.commissionRate;
  }
}
