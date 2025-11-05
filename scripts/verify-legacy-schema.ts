#!/usr/bin/env tsx
/**
 * Verify Legacy Database Schema
 *
 * Connects to the legacy database and runs verification queries
 * to confirm which fields are unused before migration.
 *
 * Usage:
 *   pnpm tsx scripts/verify-legacy-schema.ts
 *
 * Or with explicit connection:
 *   DATABASE_URL_LEGACY="postgresql://..." pnpm tsx scripts/verify-legacy-schema.ts
 */
// import { drizzle } from 'drizzle-orm/postgres-js'; // TODO: Currently unused
import postgres from 'postgres';

// Legacy database connection
const legacyDbUrl = process.env.DATABASE_URL_LEGACY || process.env.DATABASE_URL;

if (!legacyDbUrl) {
  console.error('❌ DATABASE_URL_LEGACY not set');
  console.error('Set it with: export DATABASE_URL_LEGACY="postgresql://..."');
  process.exit(1);
}

console.log('🔌 Connecting to legacy database...\n');

const sql = postgres(legacyDbUrl, { max: 1 });
// const db = drizzle(sql); // TODO: Currently unused, kept for future migrations

interface QueryResult {
  name: string;
  query: string;
  description: string;
}

const queries: QueryResult[] = [
  {
    name: '1. Subscription Fields',
    description: 'Check if subscription fields are unused (expected: all 0)',
    query: `
      SELECT 
        COUNT(*) as total_users,
        COUNT("subscriptionId") as with_subscription_id,
        COUNT("subscriptionStatus") as with_subscription_status,
        COUNT("subscriptionPriceId") as with_price_id,
        COUNT("subscriptionCurrentPeriodEnd") as with_period_end,
        COUNT("subscriptionCanceledAt") as with_canceled_at,
        SUM(CASE WHEN "hasHadSubscription" = true THEN 1 ELSE 0 END) as has_had_subscription
      FROM users;
    `,
  },
  {
    name: '2. Meeting Payout Fields',
    description: 'Check if meeting payout fields are unused (expected: all 0)',
    query: `
      SELECT 
        COUNT(*) as total_meetings,
        COUNT("stripePayoutId") as with_payout_id,
        COUNT("stripePayoutAmount") as with_payout_amount,
        COUNT("stripePayoutFailureCode") as with_failure_code,
        COUNT("stripePayoutFailureMessage") as with_failure_message,
        COUNT("stripePayoutPaidAt") as with_paid_at,
        COUNT("lastProcessedAt") as with_last_processed
      FROM meetings;
    `,
  },
  {
    name: '3. PaymentTransfer Table Check',
    description: 'Verify PaymentTransfer is the actual source of truth',
    query: `
      SELECT 
        COUNT(*) as total_transfers,
        COUNT("transferId") as with_transfer_id,
        COUNT("payoutId") as with_payout_id,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_transfers
      FROM payment_transfers;
    `,
  },
  {
    name: '4. Bank Account Fields',
    description: 'Check bank account field usage',
    query: `
      SELECT 
        COUNT(*) as total_users,
        COUNT("stripeBankAccountLast4") as with_bank_last4,
        COUNT("stripeBankName") as with_bank_name,
        COUNT("stripeConnectAccountId") as with_connect_account,
        ROUND(100.0 * COUNT("stripeBankAccountLast4") / NULLIF(COUNT("stripeConnectAccountId"), 0), 2) as bank_data_percentage
      FROM users;
    `,
  },
  {
    name: '5. Identity Verification',
    description: 'Check identity verification usage (should have data)',
    query: `
      SELECT 
        COUNT(*) as total_users,
        COUNT("stripeIdentityVerificationId") as with_verification_id,
        COUNT(CASE WHEN "stripeIdentityVerified" = true THEN 1 END) as verified_users,
        ROUND(100.0 * COUNT("stripeIdentityVerificationId") / COUNT(*), 2) as verification_rate
      FROM users;
    `,
  },
  {
    name: '6. Onboarding Fields',
    description: 'Check onboarding tracking (should have data)',
    query: `
      SELECT 
        COUNT(*) as total_users,
        COUNT("welcomeEmailSentAt") as with_welcome_email,
        COUNT("onboardingCompletedAt") as with_onboarding,
        ROUND(100.0 * COUNT("welcomeEmailSentAt") / COUNT(*), 2) as welcome_email_percentage
      FROM users;
    `,
  },
  {
    name: '7. Profile Fields',
    description: 'Check profile display fields usage',
    query: `
      SELECT 
        COUNT(*) as total_profiles,
        COUNT(CASE WHEN "isVerified" = true THEN 1 END) as verified_count,
        COUNT(CASE WHEN "isTopExpert" = true THEN 1 END) as top_expert_count,
        COUNT(CASE WHEN published = true THEN 1 END) as published_count
      FROM profiles;
    `,
  },
  {
    name: '8. Practitioner Agreement',
    description: 'Check legal compliance fields',
    query: `
      SELECT 
        COUNT(*) as total_profiles,
        COUNT("practitionerAgreementAcceptedAt") as with_acceptance,
        ROUND(100.0 * COUNT("practitionerAgreementAcceptedAt") / COUNT(*), 2) as acceptance_percentage
      FROM profiles;
    `,
  },
  {
    name: '9. Slot Reservations',
    description: 'Check reminder fields usage',
    query: `
      SELECT 
        COUNT(*) as total_reservations,
        COUNT("gentleReminderSentAt") as with_gentle_reminder,
        COUNT("urgentReminderSentAt") as with_urgent_reminder
      FROM slot_reservations;
    `,
  },
];

async function runVerification() {
  console.log('📊 Running Schema Verification Queries\n');
  console.log('='.repeat(80));
  console.log('\n');

  const results: Record<string, any> = {};

  for (const { name, description, query } of queries) {
    try {
      console.log(`\n🔍 ${name}`);
      console.log(`   ${description}`);
      console.log('   ' + '-'.repeat(70));

      const result = await sql.unsafe(query);

      if (result.length > 0) {
        results[name] = result[0];

        // Pretty print results
        for (const [key, value] of Object.entries(result[0])) {
          console.log(`   ${key.padEnd(30)}: ${value}`);
        }
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('📋 VERIFICATION SUMMARY');
  console.log('='.repeat(80) + '\n');

  // Analyze results
  const subscriptionData = results['1. Subscription Fields'];
  if (subscriptionData) {
    const hasSubscriptions =
      subscriptionData.with_subscription_id > 0 ||
      subscriptionData.with_subscription_status > 0 ||
      subscriptionData.has_had_subscription > 0;

    if (hasSubscriptions) {
      console.log('⚠️  SUBSCRIPTION FIELDS: Found data - DO NOT remove!');
    } else {
      console.log('✅ SUBSCRIPTION FIELDS: All NULL - Safe to remove');
    }
  }

  const payoutData = results['2. Meeting Payout Fields'];
  if (payoutData) {
    const hasPayouts = payoutData.with_payout_id > 0 || payoutData.with_payout_amount > 0;

    if (hasPayouts) {
      console.log('⚠️  MEETING PAYOUT FIELDS: Found data - DO NOT remove!');
    } else {
      console.log('✅ MEETING PAYOUT FIELDS: All NULL - Safe to remove');
    }
  }

  const bankData = results['4. Bank Account Fields'];
  if (bankData) {
    const percentage = parseFloat(bankData.bank_data_percentage || '0');
    if (percentage > 50) {
      console.log(`ℹ️  BANK ACCOUNT FIELDS: ${percentage}% populated - Consider keeping`);
    } else {
      console.log(`✅ BANK ACCOUNT FIELDS: ${percentage}% populated - Safe to remove`);
    }
  }

  const identityData = results['5. Identity Verification'];
  if (identityData) {
    const rate = parseFloat(identityData.verification_rate || '0');
    if (rate > 0) {
      console.log(`✅ IDENTITY VERIFICATION: ${rate}% usage - Keep (actively used)`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📝 NEXT STEPS');
  console.log('='.repeat(80) + '\n');
  console.log('1. Review the results above');
  console.log('2. If all checks pass, proceed with schema updates');
  console.log('3. Run: pnpm tsx scripts/update-workos-schema.ts');
  console.log('4. Generate migration: pnpm drizzle-kit generate');
  console.log('\n');
}

// Run verification
runVerification()
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end();
  });
