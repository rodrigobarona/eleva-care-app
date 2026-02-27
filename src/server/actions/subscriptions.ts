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

import { EXPERT_INVITE_LOOKUP_KEYS } from '@/config/subscription-lookup-keys';
import { SUBSCRIPTION_PRICING } from '@/config/subscription-pricing';
import { db, invalidateCache } from '@/drizzle/db';
import {
  OrganizationsTable,
  SubscriptionEventsTable,
  SubscriptionPlansTable,
  UserOrgMembershipsTable,
  UsersTable,
} from '@/drizzle/schema';
import { workos } from '@/lib/integrations/workos/client';
import { getServerStripe } from '@/lib/integrations/stripe';
import { withAuth } from '@workos-inc/authkit-nextjs';
import * as Sentry from '@sentry/nextjs';
import { eq } from 'drizzle-orm';

const { logger } = Sentry;

// ============================================================================
// Types
// ============================================================================

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';

export interface SubscriptionInfo {
  id: string;
  planType: 'commission' | 'monthly' | 'annual' | 'team';
  tierLevel: 'community' | 'top' | 'starter' | 'professional' | 'enterprise';
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
// Helper Functions
// ============================================================================

/**
 * Get user's organization ID
 *
 * 🏢 ORGANIZATION-CENTRIC HELPER (Industry Standard)
 *
 * Subscriptions are owned by organizations, not users.
 * This helper retrieves the orgId needed for subscription queries.
 *
 * Pattern: User → Membership → Organization → Subscription
 *
 * @param workosUserId - The WorkOS user ID
 * @returns Organization ID or null if not found
 */
async function getUserOrgId(workosUserId: string): Promise<string | null> {
  const membership = await db.query.UserOrgMembershipsTable.findFirst({
    where: eq(UserOrgMembershipsTable.workosUserId, workosUserId),
    columns: { orgId: true },
  });

  return membership?.orgId || null;
}

// ============================================================================
// Get Subscription Status
// ============================================================================

/**
 * Get the current subscription status for a user's organization
 *
 * 🏢 ORGANIZATION-CENTRIC (Industry Standard)
 * Subscriptions are owned by organizations, not users.
 * All members of the same organization share the same subscription.
 *
 * @param workosUserId - The WorkOS user ID (optional, uses current user if not provided)
 * @returns Subscription information or null if no subscription exists
 */
export async function getSubscriptionStatus(
  workosUserId?: string,
): Promise<SubscriptionInfo | null> {
  return Sentry.withServerActionInstrumentation('getSubscriptionStatus', { recordResponse: true }, async () => {
  try {
    let userId = workosUserId;

    if (!userId) {
      const { user } = await withAuth({ ensureSignedIn: true });
      userId = user.id;
    }

    // ✅ Get user's organization ID (org-centric lookup)
    const orgId = await getUserOrgId(userId);

    if (!orgId) {
      logger.warn('[getSubscriptionStatus] No organization found for user', { userId });
      return null;
    }

    // ✅ Get subscription from database (by orgId, not userId)
    const subscription = await db.query.SubscriptionPlansTable.findFirst({
      where: eq(SubscriptionPlansTable.orgId, orgId),
    });

    if (!subscription) {
      // User has no subscription, default to commission-based
      // Determine tier based on role
      const userRecord = await db.query.UsersTable.findFirst({
        where: eq(UsersTable.workosUserId, userId),
        columns: { role: true },
      });

      const tierLevel = userRecord?.role === 'expert_top' ? 'top' : 'community';

      const commissionRate =
        tierLevel === 'top'
          ? SUBSCRIPTION_PRICING.commission_based.top_expert.commissionRate
          : SUBSCRIPTION_PRICING.commission_based.community_expert.commissionRate;

      return {
        id: 'default',
        planType: 'commission' as const,
        tierLevel: tierLevel as 'community' | 'top',
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
        const stripe = await getServerStripe();
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId,
        );
        cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
        currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
        currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      } catch (error) {
        logger.error('Error fetching Stripe subscription', { error });
        Sentry.captureException(error);
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
    logger.error('Error getting subscription status', { error });
    Sentry.captureException(error);
    return null;
  }
  });
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
  return Sentry.withServerActionInstrumentation('createSubscription', { recordResponse: true }, async () => {
  try {
    const stripe = await getServerStripe();
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

    // ✅ Check if organization already has an active subscription
    const existingSubscription = await db.query.SubscriptionPlansTable.findFirst({
      where: eq(SubscriptionPlansTable.orgId, membership.orgId),
    });

    if (existingSubscription && existingSubscription.subscriptionStatus === 'active') {
      return { success: false, error: 'Your organization already has an active subscription' };
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

    // Sync Stripe customer ID to WorkOS organization
    const orgId = await getUserOrgId(user.id);
    if (orgId && customerId) {
      try {
        const orgRecord = await db.query.OrganizationsTable.findFirst({
          where: eq(OrganizationsTable.id, orgId),
          columns: { workosOrgId: true, stripeCustomerId: true },
        });

        if (orgRecord && !orgRecord.stripeCustomerId) {
          await workos.organizations.updateOrganization({
            organization: orgRecord.workosOrgId,
            stripeCustomerId: customerId,
          });

          await db
            .update(OrganizationsTable)
            .set({ stripeCustomerId: customerId })
            .where(eq(OrganizationsTable.id, orgId));

          logger.info('Synced Stripe customer ID to WorkOS organization', {
            orgId,
            stripeCustomerId: customerId,
          });
        }
      } catch (syncError) {
        // Non-fatal: sync can be retried later
        logger.warn('Failed to sync Stripe customer ID to WorkOS org', { syncError });
      }
    }

    // Resolve price ID from lookup key (if needed)
    // If priceId is already a Stripe ID (starts with 'price_'), use it directly
    // Otherwise, treat it as a lookup key and resolve it
    let stripePriceId = priceId;
    if (!priceId.startsWith('price_')) {
      // priceId is actually a lookup key, resolve it
      const { getPriceIdByLookupKey } = await import('@/lib/stripe/price-resolver');
      const resolvedPriceId = await getPriceIdByLookupKey(priceId);
      if (!resolvedPriceId) {
        throw new Error(`No active price found for lookup key: ${priceId}`);
      }
      stripePriceId = resolvedPriceId;
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?canceled=true`,
      client_reference_id: membership.orgId, // ✅ Organization ID for tracking
      metadata: {
        workosUserId: user.id, // User who initiated (billing admin)
        orgId: membership.orgId, // ✅ Organization owner
        tierLevel,
        priceId,
        billingInterval,
      },
      subscription_data: {
        metadata: {
          workosUserId: user.id, // User who initiated (billing admin)
          orgId: membership.orgId, // ✅ Organization owner
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

    await invalidateCache([`subscription-${user.id}`]);

    return {
      success: true,
      checkoutUrl: session.url || undefined,
    };
  } catch (error) {
    logger.error('Error creating subscription', { error });
    Sentry.captureException(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create subscription',
    };
  }
  });
}

// ============================================================================
// Cancel Subscription
// ============================================================================

/**
 * Cancel an organization's subscription
 *
 * 🏢 ORGANIZATION-CENTRIC (Industry Standard)
 * Cancels the organization's subscription at the end of the current billing period.
 *
 * @param reason - Optional reason for cancellation
 * @returns Success status
 */
export async function cancelSubscription(reason?: string): Promise<CreateSubscriptionResult> {
  return Sentry.withServerActionInstrumentation('cancelSubscription', { recordResponse: true }, async () => {
  try {
    const stripe = await getServerStripe();
    const { user } = await withAuth({ ensureSignedIn: true });

    // ✅ Get user's organization ID
    const orgId = await getUserOrgId(user.id);

    if (!orgId) {
      return { success: false, error: 'Organization not found' };
    }

    // ✅ Get subscription from database (by orgId)
    const subscription = await db.query.SubscriptionPlansTable.findFirst({
      where: eq(SubscriptionPlansTable.orgId, orgId),
    });

    if (!subscription) {
      return { success: false, error: 'No subscription found for your organization' };
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

    await invalidateCache([`subscription-${user.id}`]);

    return { success: true };
  } catch (error) {
    logger.error('Error canceling subscription', { error });
    Sentry.captureException(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel subscription',
    };
  }
  });
}

// ============================================================================
// Reactivate Subscription
// ============================================================================

/**
 * Reactivate a canceled subscription before the period ends
 *
 * 🏢 ORGANIZATION-CENTRIC (Industry Standard)
 * Reactivates the organization's subscription if it was set to cancel.
 */
export async function reactivateSubscription(): Promise<CreateSubscriptionResult> {
  return Sentry.withServerActionInstrumentation('reactivateSubscription', { recordResponse: true }, async () => {
  try {
    const stripe = await getServerStripe();
    const { user } = await withAuth({ ensureSignedIn: true });

    // ✅ Get user's organization ID
    const orgId = await getUserOrgId(user.id);

    if (!orgId) {
      return { success: false, error: 'Organization not found' };
    }

    // ✅ Get subscription from database (by orgId)
    const subscription = await db.query.SubscriptionPlansTable.findFirst({
      where: eq(SubscriptionPlansTable.orgId, orgId),
    });

    if (!subscription?.stripeSubscriptionId) {
      return { success: false, error: 'No subscription found for your organization' };
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

    await invalidateCache([`subscription-${user.id}`]);

    return { success: true };
  } catch (error) {
    logger.error('Error reactivating subscription', { error });
    Sentry.captureException(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reactivate subscription',
    };
  }
  });
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
  return Sentry.withServerActionInstrumentation('getCurrentCommissionRate', { recordResponse: true }, async () => {
  try {
    const subscription = await getSubscriptionStatus(workosUserId);

    if (!subscription) {
      // Default to highest commission rate if no subscription found
      return SUBSCRIPTION_PRICING.commission_based.community_expert.commissionRate;
    }

    return subscription.commissionRate;
  } catch (error) {
    logger.error('Error getting commission rate', { error });
    Sentry.captureException(error);
    // Return default commission rate on error
    return SUBSCRIPTION_PRICING.commission_based.community_expert.commissionRate;
  }
  });
}

// ============================================================================
// Create Invite Subscription
// ============================================================================

/**
 * Create a €0 invite subscription for admin-approved experts
 *
 * When an admin approves an expert application, this creates a free Stripe
 * subscription using the invite lookup key. This triggers the webhook flow
 * that creates a SubscriptionPlansTable entry with planType='commission'
 * and delivers WorkOS entitlements via the JWT.
 *
 * @param workosUserId - The expert's WorkOS user ID
 * @param tierLevel - The expert tier ('community' or 'top')
 * @returns Success status with subscription ID
 */
export async function createInviteSubscription(
  workosUserId: string,
  tierLevel: 'community' | 'top',
): Promise<CreateSubscriptionResult> {
  return Sentry.withServerActionInstrumentation('createInviteSubscription', { recordResponse: true }, async () => {
    try {
      const stripe = await getServerStripe();

      // Get user record
      const userRecord = await db.query.UsersTable.findFirst({
        where: eq(UsersTable.workosUserId, workosUserId),
        columns: {
          stripeCustomerId: true,
          email: true,
        },
      });

      if (!userRecord) {
        return { success: false, error: 'User not found' };
      }

      // Get or create Stripe customer
      let customerId = userRecord.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userRecord.email,
          metadata: {
            workosUserId,
            type: 'expert_invite',
          },
        });
        customerId = customer.id;

        await db
          .update(UsersTable)
          .set({ stripeCustomerId: customerId })
          .where(eq(UsersTable.workosUserId, workosUserId));
      }

      // Get user's organization
      const membership = await db.query.UserOrgMembershipsTable.findFirst({
        where: eq(UserOrgMembershipsTable.workosUserId, workosUserId),
        columns: { orgId: true },
      });

      if (!membership?.orgId) {
        return { success: false, error: 'Organization not found for user' };
      }

      // Sync Stripe customer to WorkOS org if needed
      const orgRecord = await db.query.OrganizationsTable.findFirst({
        where: eq(OrganizationsTable.id, membership.orgId),
        columns: { workosOrgId: true, stripeCustomerId: true },
      });

      if (orgRecord && !orgRecord.stripeCustomerId && customerId) {
        try {
          await workos.organizations.updateOrganization({
            organization: orgRecord.workosOrgId,
            stripeCustomerId: customerId,
          });
          await db
            .update(OrganizationsTable)
            .set({ stripeCustomerId: customerId })
            .where(eq(OrganizationsTable.id, membership.orgId));
        } catch (syncError) {
          logger.warn('Failed to sync Stripe customer ID to WorkOS org', { syncError });
        }
      }

      // Check for existing subscription
      const existingSubscription = await db.query.SubscriptionPlansTable.findFirst({
        where: eq(SubscriptionPlansTable.orgId, membership.orgId),
      });

      if (existingSubscription && existingSubscription.subscriptionStatus === 'active') {
        return { success: false, error: 'Organization already has an active subscription' };
      }

      // Resolve invite price by lookup key
      const lookupKey = tierLevel === 'top'
        ? EXPERT_INVITE_LOOKUP_KEYS.top
        : EXPERT_INVITE_LOOKUP_KEYS.community;

      const prices = await stripe.prices.list({
        lookup_keys: [lookupKey],
        active: true,
        limit: 1,
      });

      if (prices.data.length === 0) {
        return { success: false, error: `No price found for invite lookup key: ${lookupKey}` };
      }

      // Create €0 subscription directly (no checkout needed for free plans)
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: prices.data[0].id }],
        metadata: {
          workosUserId,
          orgId: membership.orgId,
          tierLevel,
          billingInterval: 'month',
          type: 'expert_invite',
        },
      });

      logger.info('Created invite subscription for expert', {
        workosUserId,
        tierLevel,
        subscriptionId: subscription.id,
        lookupKey,
      });

      // Log subscription event
      await db.insert(SubscriptionEventsTable).values({
        workosUserId,
        orgId: membership.orgId,
        eventType: 'plan_created',
        newPlanType: 'commission',
        newTierLevel: tierLevel,
        stripeEventId: null,
        stripeSubscriptionId: subscription.id,
        reason: 'admin_invite',
        metadata: {
          lookupKey,
          inviteSubscription: true,
        },
      });

      return {
        success: true,
        subscriptionId: subscription.id,
      };
    } catch (error) {
      logger.error('Error creating invite subscription', { error });
      Sentry.captureException(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invite subscription',
      };
    }
  });
}
