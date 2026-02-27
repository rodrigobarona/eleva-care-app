/**
 * Backfill Script: Sync Stripe Customer IDs to WorkOS Organizations
 *
 * One-time migration to link existing Stripe customers to their WorkOS organizations.
 * This enables the WorkOS Stripe Add-on (Entitlements + Seat Sync) to function.
 *
 * For each expert_individual org:
 * 1. Find the owner's stripeCustomerId from UsersTable
 * 2. Call workos.organizations.updateOrganization({ stripeCustomerId })
 * 3. Update OrganizationsTable.stripeCustomerId locally
 *
 * Usage: npx tsx drizzle/backfill-stripe-customer-to-workos-orgs.ts
 */

import { db } from '@/drizzle/db';
import { OrganizationsTable, UserOrgMembershipsTable, UsersTable } from '@/drizzle/schema';
import { workos } from '@/lib/integrations/workos/client';
import { and, eq, isNull } from 'drizzle-orm';

interface BackfillResult {
  total: number;
  synced: number;
  skipped: number;
  errors: Array<{ orgId: string; error: string }>;
}

async function backfillStripeCustomerIds(): Promise<BackfillResult> {
  const result: BackfillResult = { total: 0, synced: 0, skipped: 0, errors: [] };

  console.log('🔄 Starting Stripe customer ID backfill...\n');

  // Find all organizations that don't have a stripeCustomerId yet
  const orgs = await db
    .select({
      orgId: OrganizationsTable.id,
      workosOrgId: OrganizationsTable.workosOrgId,
      orgName: OrganizationsTable.name,
      orgType: OrganizationsTable.type,
    })
    .from(OrganizationsTable)
    .where(isNull(OrganizationsTable.stripeCustomerId));

  result.total = orgs.length;
  console.log(`📊 Found ${orgs.length} organizations without Stripe customer ID\n`);

  for (const org of orgs) {
    try {
      // Find the owner of this organization
      const ownership = await db
        .select({
          workosUserId: UserOrgMembershipsTable.workosUserId,
        })
        .from(UserOrgMembershipsTable)
        .where(
          and(
            eq(UserOrgMembershipsTable.orgId, org.orgId),
            eq(UserOrgMembershipsTable.role, 'owner'),
            eq(UserOrgMembershipsTable.status, 'active'),
          ),
        )
        .limit(1);

      if (ownership.length === 0) {
        console.log(`⏭️  Skipping "${org.orgName}" (${org.orgType}) - no owner found`);
        result.skipped++;
        continue;
      }

      const ownerUserId = ownership[0].workosUserId;

      // Get the owner's Stripe customer ID
      const user = await db
        .select({ stripeCustomerId: UsersTable.stripeCustomerId })
        .from(UsersTable)
        .where(eq(UsersTable.workosUserId, ownerUserId))
        .limit(1);

      if (!user[0]?.stripeCustomerId) {
        console.log(`⏭️  Skipping "${org.orgName}" (${org.orgType}) - owner has no Stripe customer ID`);
        result.skipped++;
        continue;
      }

      const stripeCustomerId = user[0].stripeCustomerId;

      // Update WorkOS organization with Stripe customer ID
      await workos.organizations.updateOrganization({
        organization: org.workosOrgId,
        stripeCustomerId,
      });

      // Update local database
      await db
        .update(OrganizationsTable)
        .set({ stripeCustomerId })
        .where(eq(OrganizationsTable.id, org.orgId));

      console.log(`✅ Synced "${org.orgName}" (${org.orgType}) → ${stripeCustomerId}`);
      result.synced++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error syncing "${org.orgName}": ${errorMessage}`);
      result.errors.push({ orgId: org.orgId, error: errorMessage });
    }
  }

  return result;
}

// Run the backfill
backfillStripeCustomerIds()
  .then((result) => {
    console.log('\n📊 Backfill Complete:');
    console.log(`   Total organizations: ${result.total}`);
    console.log(`   Synced: ${result.synced}`);
    console.log(`   Skipped: ${result.skipped}`);
    console.log(`   Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      for (const err of result.errors) {
        console.log(`   - Org ${err.orgId}: ${err.error}`);
      }
    }

    process.exit(result.errors.length > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
