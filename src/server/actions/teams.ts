/**
 * Team Management Server Actions
 *
 * Handles team lifecycle operations:
 * - Creating new team organizations
 * - Team subscription management
 * - Seat management and limits
 * - Organization context switching
 *
 * Architecture:
 * - Team owner keeps their personal org (expert_individual) AND has a team org
 * - Users can belong to multiple orgs (personal + team)
 * - Org switcher handles JWT context changes via session refresh
 * - WorkOS UsersManagement widget handles invite/remove/role-change UI
 *
 * @see src/config/subscription-pricing.ts - Team pricing tiers
 * @see src/config/subscription-lookup-keys.ts - Team Stripe lookup keys
 */

'use server';

import { SUBSCRIPTION_PRICING } from '@/config/subscription-pricing';
import { TEAM_LOOKUP_KEYS } from '@/config/subscription-lookup-keys';
import { db } from '@/drizzle/db';
import {
  OrganizationsTable,
  SubscriptionPlansTable,
  UserOrgMembershipsTable,
  UsersTable,
} from '@/drizzle/schema';
import { getServerStripe } from '@/lib/integrations/stripe';
import { workos } from '@/lib/integrations/workos/client';
import * as Sentry from '@sentry/nextjs';
import { switchToOrganization, withAuth } from '@workos-inc/authkit-nextjs';
import { and, eq } from 'drizzle-orm';

const { logger } = Sentry;

// ============================================================================
// Types
// ============================================================================

export type TeamTier = 'starter' | 'professional' | 'enterprise';

export interface CreateTeamResult {
  success: boolean;
  teamId?: string;
  workosOrgId?: string;
  error?: string;
}

export interface CreateTeamSubscriptionResult {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
}

export interface TeamSeatInfo {
  currentSeats: number;
  maxSeats: number;
  canInvite: boolean;
  tier: TeamTier | null;
}

export interface TeamInfo {
  id: string;
  workosOrgId: string;
  name: string;
  slug: string;
  stripeCustomerId: string | null;
  tier: TeamTier | null;
  seatInfo: TeamSeatInfo;
}

export interface UserOrganization {
  id: string;
  workosOrgId: string;
  name: string;
  type: string;
  role: string;
  isCurrent: boolean;
}

// ============================================================================
// Team Creation
// ============================================================================

/**
 * Create a new team organization
 *
 * Creates a WorkOS org, Stripe customer, and links them together.
 * The creator becomes the team owner while keeping their personal org.
 *
 * @param name - Team/organization name
 * @returns Team creation result with IDs
 */
export async function createTeam(name: string): Promise<CreateTeamResult> {
  return Sentry.withServerActionInstrumentation('createTeam', { recordResponse: true }, async () => {
    try {
      const { user } = await withAuth({ ensureSignedIn: true });
      const stripe = await getServerStripe();

      // Get user's email for Stripe customer creation
      const userRecord = await db.query.UsersTable.findFirst({
        where: eq(UsersTable.workosUserId, user.id),
        columns: { email: true },
      });

      if (!userRecord) {
        return { success: false, error: 'User not found' };
      }

      // 1. Create WorkOS organization (type: team)
      logger.info('Creating team organization', { name, userId: user.id });
      const workosOrg = await workos.organizations.createOrganization({
        name,
        domainData: [],
      });

      // 2. Create Stripe customer for the team
      const customer = await stripe.customers.create({
        email: userRecord.email,
        name,
        metadata: {
          organizationId: workosOrg.id,
          type: 'team',
          createdBy: user.id,
        },
      });

      // 3. Link Stripe customer to WorkOS org (the bridge)
      await workos.organizations.updateOrganization({
        organization: workosOrg.id,
        stripeCustomerId: customer.id,
      });

      // 4. Generate unique slug
      const slugBase = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const slug = `team-${slugBase}-${Date.now().toString(36)}`;

      // 5. Insert org in DB
      const [org] = await db
        .insert(OrganizationsTable)
        .values({
          workosOrgId: workosOrg.id,
          slug,
          name,
          type: 'team',
          stripeCustomerId: customer.id,
        })
        .returning();

      // 6. Create owner membership (WorkOS + DB)
      await workos.userManagement.createOrganizationMembership({
        userId: user.id,
        organizationId: workosOrg.id,
        roleSlug: 'owner',
      });

      await db.insert(UserOrgMembershipsTable).values({
        workosUserId: user.id,
        orgId: org.id,
        role: 'owner',
        status: 'active',
      });

      logger.info('Team created successfully', {
        teamId: org.id,
        workosOrgId: workosOrg.id,
        stripeCustomerId: customer.id,
      });

      return {
        success: true,
        teamId: org.id,
        workosOrgId: workosOrg.id,
      };
    } catch (error) {
      logger.error('Failed to create team', { error });
      Sentry.captureException(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create team',
      };
    }
  });
}

// ============================================================================
// Team Subscription
// ============================================================================

/**
 * Create a team subscription checkout session
 *
 * Redirects the team owner to Stripe Checkout for team plan payment.
 *
 * @param teamOrgId - Internal org ID for the team
 * @param tier - Team tier (starter, professional)
 * @param interval - Billing interval (monthly, annual)
 * @returns Checkout URL or error
 */
export async function createTeamSubscription(
  teamOrgId: string,
  tier: 'starter' | 'professional',
  interval: 'month' | 'year' = 'month',
): Promise<CreateTeamSubscriptionResult> {
  return Sentry.withServerActionInstrumentation('createTeamSubscription', { recordResponse: true }, async () => {
    try {
      const { user } = await withAuth({ ensureSignedIn: true });
      const stripe = await getServerStripe();

      // Verify user is owner of this team
      const membership = await db.query.UserOrgMembershipsTable.findFirst({
        where: and(
          eq(UserOrgMembershipsTable.orgId, teamOrgId),
          eq(UserOrgMembershipsTable.workosUserId, user.id),
          eq(UserOrgMembershipsTable.role, 'owner'),
        ),
      });

      if (!membership) {
        return { success: false, error: 'Only team owners can manage subscriptions' };
      }

      // Get team org with Stripe customer ID
      const org = await db.query.OrganizationsTable.findFirst({
        where: eq(OrganizationsTable.id, teamOrgId),
        columns: { stripeCustomerId: true, workosOrgId: true, name: true },
      });

      if (!org?.stripeCustomerId) {
        return { success: false, error: 'Team does not have a billing account' };
      }

      // Determine lookup key
      const lookupKey = interval === 'year'
        ? TEAM_LOOKUP_KEYS[tier].annual
        : TEAM_LOOKUP_KEYS[tier].monthly;

      // Look up the price by lookup key
      const prices = await stripe.prices.list({
        lookup_keys: [lookupKey],
        active: true,
        limit: 1,
      });

      if (prices.data.length === 0) {
        return { success: false, error: `No price found for ${lookupKey}. Create it in Stripe first.` };
      }

      const price = prices.data[0];

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: org.stripeCustomerId,
        mode: 'subscription',
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/team/settings?subscription=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/team/settings?subscription=canceled`,
        metadata: {
          teamOrgId,
          workosOrgId: org.workosOrgId,
          tier,
          interval,
          type: 'team_subscription',
        },
        subscription_data: {
          metadata: {
            teamOrgId,
            workosOrgId: org.workosOrgId,
            tier,
            type: 'team_subscription',
          },
        },
      });

      logger.info('Team subscription checkout created', {
        teamOrgId,
        tier,
        interval,
        sessionId: session.id,
      });

      return {
        success: true,
        checkoutUrl: session.url ?? undefined,
      };
    } catch (error) {
      logger.error('Failed to create team subscription', { error });
      Sentry.captureException(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription',
      };
    }
  });
}

// ============================================================================
// Seat Management
// ============================================================================

/**
 * Get team seat information
 *
 * Returns current seat count, max seats for the tier, and whether invites are allowed.
 *
 * @param teamOrgId - Internal org ID for the team
 * @returns Seat information
 */
export async function getTeamSeatInfo(teamOrgId: string): Promise<TeamSeatInfo> {
  // Count active members
  const members = await db
    .select()
    .from(UserOrgMembershipsTable)
    .where(
      and(
        eq(UserOrgMembershipsTable.orgId, teamOrgId),
        eq(UserOrgMembershipsTable.status, 'active'),
      ),
    );

  // Get team subscription to determine tier
  const subscription = await db.query.SubscriptionPlansTable.findFirst({
    where: eq(SubscriptionPlansTable.orgId, teamOrgId),
  });

  let tier: TeamTier | null = null;
  let maxSeats = 3; // Default to starter limit

  if (subscription) {
    // Determine tier from subscription metadata or lookup key
    const pricingConfig = SUBSCRIPTION_PRICING.team_subscription;
    if (subscription.stripePriceId) {
      // Match by looking at tier levels
      for (const [tierKey, config] of Object.entries(pricingConfig)) {
        if ('stripeLookupKey' in config && subscription.stripePriceId.includes(tierKey)) {
          tier = tierKey as TeamTier;
          maxSeats = 'maxExperts' in config ? config.maxExperts : 3;
          break;
        }
      }
    }
  }

  // Enterprise has unlimited seats
  if (tier === 'enterprise') {
    maxSeats = -1; // unlimited
  }

  return {
    currentSeats: members.length,
    maxSeats,
    canInvite: maxSeats === -1 || members.length < maxSeats,
    tier,
  };
}

/**
 * Get team widget token for the UsersManagement widget
 *
 * Generates a WorkOS widget token scoped to the team organization.
 * Used to render the <UsersManagement /> widget on the team members page.
 *
 * @param teamOrgId - Internal org ID for the team
 * @returns Widget token string or null if unauthorized
 */
export async function getTeamWidgetToken(teamOrgId: string): Promise<string | null> {
  try {
    const { user } = await withAuth({ ensureSignedIn: true });

    // Verify user is a member of this team
    const membership = await db.query.UserOrgMembershipsTable.findFirst({
      where: and(
        eq(UserOrgMembershipsTable.orgId, teamOrgId),
        eq(UserOrgMembershipsTable.workosUserId, user.id),
        eq(UserOrgMembershipsTable.status, 'active'),
      ),
    });

    if (!membership) {
      return null;
    }

    // Get WorkOS org ID
    const org = await db.query.OrganizationsTable.findFirst({
      where: eq(OrganizationsTable.id, teamOrgId),
      columns: { workosOrgId: true },
    });

    if (!org) {
      return null;
    }

    // Generate widget token
    const { token } = await workos.widgets.getToken({
      userId: user.id,
      organizationId: org.workosOrgId,
      scopes: ['widgets:users-table:manage'],
    });

    return token;
  } catch (error) {
    logger.error('Failed to generate team widget token', { error, teamOrgId });
    return null;
  }
}

// ============================================================================
// Team Info
// ============================================================================

/**
 * Get team information including seat details
 *
 * @param teamOrgId - Internal org ID for the team
 * @returns Team info or null if not found
 */
export async function getTeamInfo(teamOrgId: string): Promise<TeamInfo | null> {
  const org = await db.query.OrganizationsTable.findFirst({
    where: and(
      eq(OrganizationsTable.id, teamOrgId),
      eq(OrganizationsTable.type, 'team'),
    ),
  });

  if (!org) return null;

  const seatInfo = await getTeamSeatInfo(teamOrgId);

  return {
    id: org.id,
    workosOrgId: org.workosOrgId,
    name: org.name,
    slug: org.slug,
    stripeCustomerId: org.stripeCustomerId,
    tier: seatInfo.tier,
    seatInfo,
  };
}

// ============================================================================
// Organization Switching
// ============================================================================

/**
 * Get all organizations the current user belongs to
 *
 * Used by the OrgSwitcher component to show available organizations.
 *
 * @returns Array of user's organizations with current context indicator
 */
export async function getUserOrganizations(): Promise<UserOrganization[]> {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });

  const memberships = await db.query.UserOrgMembershipsTable.findMany({
    where: and(
      eq(UserOrgMembershipsTable.workosUserId, user.id),
      eq(UserOrgMembershipsTable.status, 'active'),
    ),
    with: {
      organization: true,
    },
  });

  return memberships
    .filter((m) => m.organization)
    .map((m) => ({
      id: m.organization.id,
      workosOrgId: m.organization.workosOrgId,
      name: m.organization.name,
      type: m.organization.type,
      role: m.role,
      isCurrent: m.organization.workosOrgId === organizationId,
    }));
}

/**
 * Switch the current session to a different organization
 *
 * Refreshes the WorkOS session with the new organizationId,
 * updating role, permissions, and entitlements in the JWT.
 *
 * @param workosOrgId - WorkOS organization ID to switch to
 */
export async function switchOrganization(workosOrgId: string): Promise<void> {
  await switchToOrganization(workosOrgId, {
    revalidationStrategy: 'tag',
    revalidationTags: ['user-data', 'org-settings'],
  });
}
