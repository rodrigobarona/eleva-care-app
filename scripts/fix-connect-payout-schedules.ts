#!/usr/bin/env tsx
/**
 * CRITICAL FIX: Update existing Stripe Connect accounts to use manual payouts
 *
 * Background:
 * - All existing Connect accounts were created with automatic daily payouts
 * - This bypasses our business logic for appointment completion + 24h window
 * - Experts were receiving money immediately instead of after appointments
 *
 * This script:
 * 1. Finds all users with Connect accounts
 * 2. Updates their payout schedule to manual
 * 3. Validates the changes
 */
import { isNotNull } from 'drizzle-orm';
import Stripe from 'stripe';

import { db } from '../drizzle/db';
import { UserTable } from '../drizzle/schema';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2023-10-16',
});

interface ConnectAccountUpdate {
  accountId: string;
  userId: string;
  email: string;
  currentSchedule: string;
  updateSuccess: boolean;
  error?: string;
}

async function updateConnectAccountPayoutSchedule(accountId: string): Promise<{
  success: boolean;
  currentSchedule?: string;
  newSchedule?: string;
  error?: string;
}> {
  try {
    // First, get current payout schedule
    const account = await stripe.accounts.retrieve(accountId);
    const currentSchedule = account.settings?.payouts?.schedule?.interval || 'unknown';

    console.log(`Account ${accountId}: Current schedule = ${currentSchedule}`);

    // If already manual, skip
    if (currentSchedule === 'manual') {
      return {
        success: true,
        currentSchedule,
        newSchedule: 'manual',
      };
    }

    // Update to manual payouts
    const updatedAccount = await stripe.accounts.update(accountId, {
      settings: {
        payouts: {
          schedule: {
            interval: 'manual',
          },
        },
      },
    });

    const newSchedule = updatedAccount.settings?.payouts?.schedule?.interval;

    return {
      success: true,
      currentSchedule,
      newSchedule,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  console.log('🔧 Starting Connect Account Payout Schedule Fix...\n');

  try {
    // Get all users with Connect accounts
    const usersWithConnectAccounts = await db
      .select({
        clerkUserId: UserTable.clerkUserId,
        email: UserTable.email,
        stripeConnectAccountId: UserTable.stripeConnectAccountId,
        firstName: UserTable.firstName,
        lastName: UserTable.lastName,
      })
      .from(UserTable)
      .where(isNotNull(UserTable.stripeConnectAccountId));

    console.log(`Found ${usersWithConnectAccounts.length} users with Connect accounts\n`);

    if (usersWithConnectAccounts.length === 0) {
      console.log('No Connect accounts found. Exiting.');
      return;
    }

    const results: ConnectAccountUpdate[] = [];

    // Process each account
    for (let i = 0; i < usersWithConnectAccounts.length; i++) {
      const user = usersWithConnectAccounts[i];
      const accountId = user.stripeConnectAccountId!;
      const userInfo = `${user.firstName} ${user.lastName} (${user.email})`.trim();

      console.log(`[${i + 1}/${usersWithConnectAccounts.length}] Updating ${userInfo}...`);
      console.log(`  Account ID: ${accountId}`);

      const updateResult = await updateConnectAccountPayoutSchedule(accountId);

      const result: ConnectAccountUpdate = {
        accountId,
        userId: user.clerkUserId,
        email: user.email,
        currentSchedule: updateResult.currentSchedule || 'unknown',
        updateSuccess: updateResult.success,
        error: updateResult.error,
      };

      results.push(result);

      if (updateResult.success) {
        console.log(`  ✅ Success: ${updateResult.currentSchedule} → ${updateResult.newSchedule}`);
      } else {
        console.log(`  ❌ Failed: ${updateResult.error}`);
      }

      console.log(); // Empty line for readability

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log('='.repeat(50));

    const successful = results.filter((r) => r.updateSuccess);
    const failed = results.filter((r) => !r.updateSuccess);

    console.log(`Total accounts processed: ${results.length}`);
    console.log(`✅ Successfully updated: ${successful.length}`);
    console.log(`❌ Failed to update: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\n❌ Failed accounts:');
      failed.forEach((f) => {
        console.log(`  - ${f.email} (${f.accountId}): ${f.error}`);
      });
    }

    console.log('\n🎉 Connect account payout schedule fix completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Verify that process-pending-payouts cron now works correctly');
    console.log('2. Test with a completed appointment to ensure manual payouts trigger');
    console.log(
      '3. Monitor the system to ensure experts receive payouts after appointment completion',
    );
  } catch (error) {
    console.error('❌ Error during Connect account fix:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
