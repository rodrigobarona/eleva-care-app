/**
 * Stripe Price Lookup Keys Configuration
 *
 * Using lookup keys instead of hardcoded price IDs provides:
 * - No code deployments to change prices
 * - Environment-agnostic (same keys in test/prod)
 * - Human-readable identifiers
 * - Easy to manage via Admin Dashboard
 * - Transfer keys to new prices when updating
 *
 * @see https://docs.stripe.com/products-prices/manage-prices#lookup-keys
 * @see /admin/subscriptions - Create prices with lookup keys
 * @see _docs/02-core-systems/RBAC-NAMING-DECISIONS.md
 */

/**
 * Expert Subscription Lookup Keys
 *
 * Format: {tier}-expert-{interval}
 * Example: community-expert-monthly
 */
export const EXPERT_LOOKUP_KEYS = {
  community: {
    monthly: 'community-expert-monthly',
    annual: 'community-expert-annual',
  },
  top: {
    monthly: 'top-expert-monthly',
    annual: 'top-expert-annual',
  },
} as const;

/**
 * $0 Invite-Only Expert Lookup Keys
 *
 * Used for early experts who are approved by admin and get free access.
 * These create a $0 Stripe subscription to trigger the webhook flow
 * that automatically assigns the correct WorkOS role.
 *
 * Format: {tier}-expert-invite
 */
export const EXPERT_INVITE_LOOKUP_KEYS = {
  community: 'community-expert-invite',
  top: 'top-expert-invite',
} as const;

/**
 * Lecturer Module Lookup Keys
 *
 * Lecturer is a Stripe addon subscription, not a standalone role.
 * Can be added to any user (member or expert) to grant lecture capabilities.
 */
export const LECTURER_LOOKUP_KEYS = {
  annual: 'lecturer-module-annual',
  invite: 'lecturer-module-invite',
} as const;

/**
 * Team Subscription Lookup Keys
 *
 * Format: team-{tier}-{interval}
 * Example: team-starter-monthly
 *
 * @see _docs/02-core-systems/NAMING-CONVENTIONS-GLOSSARY.md
 */
export const TEAM_LOOKUP_KEYS = {
  starter: {
    monthly: 'team-starter-monthly',
    annual: 'team-starter-annual',
  },
  professional: {
    monthly: 'team-professional-monthly',
    annual: 'team-professional-annual',
  },
  enterprise: {
    monthly: 'team-enterprise-monthly',
    annual: 'team-enterprise-annual',
  },
} as const;

/**
 * All lookup keys (for validation and listing)
 */
export const ALL_LOOKUP_KEYS = [
  ...Object.values(EXPERT_LOOKUP_KEYS.community),
  ...Object.values(EXPERT_LOOKUP_KEYS.top),
  ...Object.values(EXPERT_INVITE_LOOKUP_KEYS),
  ...Object.values(LECTURER_LOOKUP_KEYS),
  ...Object.values(TEAM_LOOKUP_KEYS.starter),
  ...Object.values(TEAM_LOOKUP_KEYS.professional),
  ...Object.values(TEAM_LOOKUP_KEYS.enterprise),
] as const;

/**
 * Type exports
 */
export type ExpertLookupKey = (typeof ALL_LOOKUP_KEYS)[number];
export type ExpertTier = keyof typeof EXPERT_LOOKUP_KEYS;
export type BillingInterval = 'monthly' | 'annual';
export type TeamTier = keyof typeof TEAM_LOOKUP_KEYS;

/**
 * Helper to get lookup key by tier and interval
 */
export function getExpertLookupKey(tier: ExpertTier, interval: BillingInterval): string {
  return EXPERT_LOOKUP_KEYS[tier][interval];
}

/**
 * Helper to get team lookup key
 */
export function getTeamLookupKey(tier: TeamTier, interval: BillingInterval): string {
  return TEAM_LOOKUP_KEYS[tier][interval];
}

/**
 * Helper to validate lookup key exists
 */
export function isValidLookupKey(key: string): key is ExpertLookupKey {
  return ALL_LOOKUP_KEYS.includes(key as ExpertLookupKey);
}
