# Stripe Entitlements Setup Guide

## Overview

WorkOS Stripe Entitlements automatically include subscription-based features in JWT access tokens.
When a user's organization has an active Stripe subscription with entitlements, those entitlement
lookup keys appear in the `entitlements` claim of the access token.

## Prerequisites

1. WorkOS Stripe Add-on connected (Authentication > Add-ons > Stripe in WorkOS Dashboard)
2. "Use Stripe entitlements" toggle enabled
3. Stripe customer ID set on each WorkOS organization (Phase 1 bridge)

## Team Products (Created via Stripe MCP)

| Product | Product ID | Price IDs | Lookup Keys |
|---------|------------|-----------|-------------|
| Team Starter | `prod_U2zEf2kM2vrumY` | Monthly: `price_1T4tGMK5Ap4Um3SpiU1Xlubw` (€99/mo)<br>Annual: `price_1T4tGNK5Ap4Um3Spi1NIveBR` (€990/yr) | `team-starter-monthly`, `team-starter-annual` |
| Team Professional | `prod_U2zEWE9S9arlXH` | Monthly: `price_1T4tGSK5Ap4Um3SpeusHgw07` (€199/mo)<br>Annual: `price_1T4tGTK5Ap4Um3SpljXwRJON` (€1,990/yr) | `team-professional-monthly`, `team-professional-annual` |
| Team Enterprise | `prod_U2zFGcLqAfYuzp` | No price (custom/sales-led) | N/A |

## Step 1: Create Entitlements in Stripe

**Note:** The Stripe MCP does not have entitlement/feature tools. Create these in Stripe Dashboard > Product Catalog > Features.

| Lookup Key | Description | Plans |
|---|---|---|
| `unlimited_services` | Create unlimited services/events | Top Expert (all) | 
| `daily_payouts` | Daily payout frequency | Top Expert (all) |
| `advanced_analytics` | Advanced analytics dashboard | Top Expert (all) |
| `priority_support` | Priority support access | Top Expert (all) |
| `featured_placement` | Featured in search/listings | Top Expert (all) |
| `custom_branding` | Custom branding options | Top Expert (all) |
| `group_sessions` | Group session capability | Top Expert (all) |
| `reduced_commission` | Lower commission rate | Monthly/Annual plans |
| `lecturer_module` | Lecturer module access | Lecturer addon |
| `team_starter` | Team starter plan | Team Starter |
| `team_professional` | Team professional plan | Team Professional |
| `team_enterprise` | Team enterprise plan | Team Enterprise |

## Step 2: Attach Entitlements to Products

For each Stripe product/price:
1. Go to the product in Stripe Dashboard
2. Under "Entitlements", add the relevant lookup keys
3. Save

Example: "Top Expert Subscription" (`prod_U2zjuGKxWGZH0U`) monthly/annual prices should have:
- `unlimited_services`
- `daily_payouts`
- `advanced_analytics`
- `priority_support`
- `featured_placement`
- `custom_branding`
- `group_sessions`
- `reduced_commission`

Team products (attach to each product):
- **Team Starter** (`prod_U2zEf2kM2vrumY`): `team_starter`
- **Team Professional** (`prod_U2zEWE9S9arlXH`): `team_professional`
- **Team Enterprise** (`prod_U2zFGcLqAfYuzp`): `team_enterprise`

## Step 3: Verify in Application

After setup, the entitlements will appear in the JWT:

```typescript
import { getTokenClaims } from '@workos-inc/authkit-nextjs';

const claims = await getTokenClaims();
console.log(claims?.entitlements);
// ["unlimited_services", "daily_payouts", "advanced_analytics", ...]
```

Use the helpers in `src/lib/integrations/workos/rbac.ts`:

```typescript
import { hasEntitlement, requireEntitlement } from '@/lib/integrations/workos/rbac';
import { STRIPE_ENTITLEMENTS } from '@/types/workos-rbac';

// Check
if (await hasEntitlement(STRIPE_ENTITLEMENTS.UNLIMITED_SERVICES)) {
  // Allow unlimited services
}

// Require (throws if not)
await requireEntitlement(STRIPE_ENTITLEMENTS.ADVANCED_ANALYTICS);
```

## Step 4: Session Refresh After Subscription Changes

Entitlements update on the next session refresh (every 5 minutes via access token duration).
For immediate updates after checkout:

```typescript
import { useAuth, useAccessToken } from '@workos-inc/authkit-nextjs/components';

// Option 1: Full session refresh (updates user, org, and token)
const { refreshAuth } = useAuth();
await refreshAuth();

// Option 2: Token-only refresh (updates access token with new entitlements)
const { refresh } = useAccessToken();
await refresh();
```

## Stripe Seat Sync Setup

For team plans with usage-based billing:

1. Enable "Sync organization seat counts" in WorkOS Dashboard
2. WorkOS creates a `workos_seat_count` billing meter in Stripe
3. Create team subscription products using the meter
4. WorkOS automatically sends meter events when org members change

No application code needed for metering.
