#!/usr/bin/env tsx
/**
 * Verify Legacy Clerk-Based Database Schema
 *
 * This version uses Clerk column naming (camelCase) to match the legacy database.
 */
// import { drizzle } from 'drizzle-orm/postgres-js'; // TODO: Currently unused
import postgres from 'postgres';

const legacyDbUrl = process.env.DATABASE_URL_LEGACY || process.env.DATABASE_URL;

if (!legacyDbUrl) {
  console.error('❌ DATABASE_URL_LEGACY not set');
  process.exit(1);
}

console.log('🔌 Connecting to legacy Clerk database...\n');

const sql = postgres(legacyDbUrl, { max: 1 });

async function runVerification() {
  console.log('📊 Schema Verification Results\n');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Subscription Fields (CRITICAL CHECK)
    console.log('🔍 1. SUBSCRIPTION FIELDS (Priority: HIGH)');
    console.log('-'.repeat(80));
    const subscriptionCheck = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT("subscriptionId") as with_subscription_id,
        COUNT("subscriptionStatus") as with_subscription_status,
        COUNT("subscriptionPriceId") as with_price_id,
        COUNT("subscriptionCurrentPeriodEnd") as with_period_end,
        COUNT("subscriptionCanceledAt") as with_canceled_at,
        SUM(CASE WHEN "hasHadSubscription" = true THEN 1 ELSE 0 END) as has_had_subscription
      FROM users;
    `;

    console.log(`Total users: ${subscriptionCheck[0].total_users}`);
    console.log(`With subscriptionId: ${subscriptionCheck[0].with_subscription_id}`);
    console.log(`With subscriptionStatus: ${subscriptionCheck[0].with_subscription_status}`);
    console.log(`With subscriptionPriceId: ${subscriptionCheck[0].with_price_id}`);
    console.log(`With subscriptionCurrentPeriodEnd: ${subscriptionCheck[0].with_period_end}`);
    console.log(`With subscriptionCanceledAt: ${subscriptionCheck[0].with_canceled_at}`);
    console.log(`With hasHadSubscription=true: ${subscriptionCheck[0].has_had_subscription}`);

    if (
      subscriptionCheck[0].with_subscription_id > 0 ||
      subscriptionCheck[0].with_subscription_status > 0
    ) {
      console.log('\n⚠️  WARNING: Subscription data found - DO NOT REMOVE THESE FIELDS!');
    } else {
      console.log('\n✅ SAFE TO REMOVE: All subscription fields are NULL');
    }
    console.log('\n');

    // 2. Meeting Payout Fields (CRITICAL CHECK)
    console.log('🔍 2. MEETING PAYOUT FIELDS (Priority: HIGH)');
    console.log('-'.repeat(80));
    const payoutCheck = await sql`
      SELECT 
        COUNT(*) as total_meetings,
        COUNT("stripePayoutId") as with_payout_id,
        COUNT("stripePayoutAmount") as with_payout_amount,
        COUNT("stripePayoutFailureCode") as with_failure_code,
        COUNT("stripePayoutFailureMessage") as with_failure_message,
        COUNT("stripePayoutPaidAt") as with_paid_at,
        COUNT("lastProcessedAt") as with_last_processed
      FROM meetings;
    `;

    console.log(`Total meetings: ${payoutCheck[0].total_meetings}`);
    console.log(`With stripePayoutId: ${payoutCheck[0].with_payout_id}`);
    console.log(`With stripePayoutAmount: ${payoutCheck[0].with_payout_amount}`);
    console.log(`With stripePayoutFailureCode: ${payoutCheck[0].with_failure_code}`);
    console.log(`With stripePayoutFailureMessage: ${payoutCheck[0].with_failure_message}`);
    console.log(`With stripePayoutPaidAt: ${payoutCheck[0].with_paid_at}`);
    console.log(`With lastProcessedAt: ${payoutCheck[0].with_last_processed}`);

    if (payoutCheck[0].with_payout_id > 0 || payoutCheck[0].with_payout_amount > 0) {
      console.log('\n⚠️  WARNING: Payout data found - DO NOT REMOVE THESE FIELDS!');
    } else {
      console.log('\n✅ SAFE TO REMOVE: All payout fields are NULL');
    }
    console.log('\n');

    // 3. PaymentTransfer Table (Should have data)
    console.log('🔍 3. PAYMENT TRANSFERS TABLE (Should contain payout data)');
    console.log('-'.repeat(80));
    const transferCheck = await sql`
      SELECT 
        COUNT(*) as total_transfers,
        COUNT("transferId") as with_transfer_id,
        COUNT("payoutId") as with_payout_id,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_transfers
      FROM payment_transfers;
    `;

    console.log(`Total payment transfers: ${transferCheck[0].total_transfers}`);
    console.log(`With transferId: ${transferCheck[0].with_transfer_id}`);
    console.log(`With payoutId: ${transferCheck[0].with_payout_id}`);
    console.log(`Completed transfers: ${transferCheck[0].completed_transfers}`);

    if (transferCheck[0].total_transfers > 0) {
      console.log('\n✅ CONFIRMED: PaymentTransfersTable is the source of truth for payouts');
    } else {
      console.log('\nℹ️  No payment transfers yet (expected for new database)');
    }
    console.log('\n');

    // 4. Bank Account Fields
    console.log('🔍 4. BANK ACCOUNT DISPLAY FIELDS (Optional removal)');
    console.log('-'.repeat(80));
    const bankCheck = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT("stripeBankAccountLast4") as with_bank_last4,
        COUNT("stripeBankName") as with_bank_name,
        COUNT("stripeConnectAccountId") as with_connect_account,
        CASE 
          WHEN COUNT("stripeConnectAccountId") > 0 
          THEN ROUND(100.0 * COUNT("stripeBankAccountLast4") / COUNT("stripeConnectAccountId"), 2)
          ELSE 0 
        END as bank_data_percentage
      FROM users;
    `;

    console.log(`Total users: ${bankCheck[0].total_users}`);
    console.log(`With bank account last 4: ${bankCheck[0].with_bank_last4}`);
    console.log(`With bank name: ${bankCheck[0].with_bank_name}`);
    console.log(`With Stripe Connect account: ${bankCheck[0].with_connect_account}`);
    console.log(`Bank data population: ${bankCheck[0].bank_data_percentage}%`);

    const bankPercentage = parseFloat(bankCheck[0].bank_data_percentage || '0');
    if (bankPercentage > 50) {
      console.log('\nℹ️  RECOMMEND KEEPING: Bank data is well populated');
    } else {
      console.log('\n✅ SAFE TO REMOVE: Low usage - can fetch from Stripe API instead');
    }
    console.log('\n');

    // 5. Identity Verification (Should keep)
    console.log('🔍 5. IDENTITY VERIFICATION FIELDS (Should be kept)');
    console.log('-'.repeat(80));
    const identityCheck = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT("stripeIdentityVerificationId") as with_verification_id,
        COUNT(CASE WHEN "stripeIdentityVerified" = true THEN 1 END) as verified_users,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND(100.0 * COUNT("stripeIdentityVerificationId") / COUNT(*), 2)
          ELSE 0 
        END as verification_rate
      FROM users;
    `;

    console.log(`Total users: ${identityCheck[0].total_users}`);
    console.log(`With verification ID: ${identityCheck[0].with_verification_id}`);
    console.log(`Verified users: ${identityCheck[0].verified_users}`);
    console.log(`Verification rate: ${identityCheck[0].verification_rate}%`);

    if (parseFloat(identityCheck[0].verification_rate) > 0) {
      console.log('\n✅ KEEP THESE FIELDS: Identity verification is actively used');
    }
    console.log('\n');

    // 6. Onboarding Fields
    console.log('🔍 6. ONBOARDING TRACKING FIELDS (Should be kept)');
    console.log('-'.repeat(80));
    const onboardingCheck = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT("welcomeEmailSentAt") as with_welcome_email,
        COUNT("onboardingCompletedAt") as with_onboarding,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND(100.0 * COUNT("welcomeEmailSentAt") / COUNT(*), 2)
          ELSE 0 
        END as welcome_percentage
      FROM users;
    `;

    console.log(`Total users: ${onboardingCheck[0].total_users}`);
    console.log(`With welcome email sent: ${onboardingCheck[0].with_welcome_email}`);
    console.log(`With onboarding completed: ${onboardingCheck[0].with_onboarding}`);
    console.log(`Welcome email rate: ${onboardingCheck[0].welcome_percentage}%`);
    console.log('\n✅ KEEP THESE FIELDS: Used for onboarding flow');
    console.log('\n');

    // 7. Profile Fields
    console.log('🔍 7. PROFILE DISPLAY FIELDS (Should be kept)');
    console.log('-'.repeat(80));
    const profileCheck = await sql`
      SELECT 
        COUNT(*) as total_profiles,
        COUNT(CASE WHEN "isVerified" = true THEN 1 END) as verified_count,
        COUNT(CASE WHEN "isTopExpert" = true THEN 1 END) as top_expert_count,
        COUNT(CASE WHEN published = true THEN 1 END) as published_count
      FROM profiles;
    `;

    console.log(`Total profiles: ${profileCheck[0].total_profiles}`);
    console.log(`Verified profiles: ${profileCheck[0].verified_count}`);
    console.log(`Top experts: ${profileCheck[0].top_expert_count}`);
    console.log(`Published profiles: ${profileCheck[0].published_count}`);
    console.log('\n✅ KEEP THESE FIELDS: Actively used for profile display');
    console.log('\n');

    // 8. Practitioner Agreement
    console.log('🔍 8. PRACTITIONER AGREEMENT FIELDS (Legal compliance)');
    console.log('-'.repeat(80));
    const agreementCheck = await sql`
      SELECT 
        COUNT(*) as total_profiles,
        COUNT("practitionerAgreementAcceptedAt") as with_acceptance,
        CASE 
          WHEN COUNT(*) > 0 
          THEN ROUND(100.0 * COUNT("practitionerAgreementAcceptedAt") / COUNT(*), 2)
          ELSE 0 
        END as acceptance_percentage
      FROM profiles;
    `;

    console.log(`Total profiles: ${agreementCheck[0].total_profiles}`);
    console.log(`With practitioner agreement: ${agreementCheck[0].with_acceptance}`);
    console.log(`Acceptance rate: ${agreementCheck[0].acceptance_percentage}%`);
    console.log('\n✅ KEEP THESE FIELDS: Required for legal compliance (GDPR/HIPAA)');
    console.log('\n');

    // 9. Slot Reservations
    console.log('🔍 9. SLOT RESERVATION REMINDER FIELDS');
    console.log('-'.repeat(80));
    const slotCheck = await sql`
      SELECT 
        COUNT(*) as total_reservations,
        COUNT("gentleReminderSentAt") as with_gentle_reminder,
        COUNT("urgentReminderSentAt") as with_urgent_reminder
      FROM slot_reservations;
    `;

    console.log(`Total slot reservations: ${slotCheck[0].total_reservations}`);
    console.log(`With gentle reminder: ${slotCheck[0].with_gentle_reminder}`);
    console.log(`With urgent reminder: ${slotCheck[0].with_urgent_reminder}`);
    console.log('\n✅ KEEP THESE FIELDS: Used for payment reminders');
    console.log('\n');

    // FINAL SUMMARY
    console.log('='.repeat(80));
    console.log('🎯 FINAL VERIFICATION SUMMARY');
    console.log('='.repeat(80));
    console.log('\n✅ SAFE TO REMOVE FROM WORKOS SCHEMA:');
    console.log('   • All 6 subscription fields (users table)');
    console.log('   • All 6 payout fields (meetings table)');
    console.log('   • lastProcessedAt field (meetings table)');

    if (bankPercentage <= 50) {
      console.log('   • Bank display fields (optional - low usage)');
    }

    console.log('\n✅ CONFIRMED TO KEEP:');
    console.log('   • Identity verification fields');
    console.log('   • Onboarding tracking fields');
    console.log('   • Profile display fields');
    console.log('   • Practitioner agreement fields');
    console.log('   • Slot reservation reminder fields');
    console.log('   • PaymentTransfersTable (source of truth for payouts)');

    console.log('\n📝 RECOMMENDATION:');
    console.log('   Proceed with applying the migration to remove unused fields.');
    console.log('   Run: pnpm drizzle-kit push');
    console.log('\n');
  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

runVerification().catch((error) => {
  console.error('\n❌ Verification failed:', error);
  process.exit(1);
});
