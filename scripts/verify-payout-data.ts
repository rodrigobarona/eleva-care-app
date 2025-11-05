#!/usr/bin/env tsx
import postgres from 'postgres';

const legacyDbUrl = process.env.DATABASE_URL_LEGACY || process.env.DATABASE_URL;
const sql = postgres(legacyDbUrl, { max: 1 });

async function checkPayoutData() {
  console.log('🔍 Checking payout field data in legacy meetings table...\n');

  const result = await sql`
    SELECT 
      COUNT(*) as total_meetings,
      COUNT(stripe_payout_id) as with_payout_id,
      COUNT(stripe_payout_amount) as with_payout_amount,
      COUNT(stripe_payout_failure_code) as with_failure_code,
      COUNT(stripe_payout_failure_message) as with_failure_message,
      COUNT(stripe_payout_paid_at) as with_paid_at,
      COUNT("lastProcessedAt") as with_last_processed
    FROM meetings;
  `;

  console.log('Payout Field Data:');
  console.log('='.repeat(80));
  console.log(`Total meetings:              ${result[0].total_meetings}`);
  console.log(`With stripe_payout_id:       ${result[0].with_payout_id}`);
  console.log(`With stripe_payout_amount:   ${result[0].with_payout_amount}`);
  console.log(`With failure_code:           ${result[0].with_failure_code}`);
  console.log(`With failure_message:        ${result[0].with_failure_message}`);
  console.log(`With payout_paid_at:         ${result[0].with_paid_at}`);
  console.log(`With lastProcessedAt:        ${result[0].with_last_processed}`);
  console.log('='.repeat(80));

  const hasData =
    result[0].with_payout_id > 0 ||
    result[0].with_payout_amount > 0 ||
    result[0].with_last_processed > 0;

  if (hasData) {
    console.log('\n⚠️  WARNING: Payout data exists! DO NOT remove these fields!');
    console.log('\nShowing sample data:');
    const sample = await sql`
      SELECT 
        id,
        stripe_payout_id,
        stripe_payout_amount,
        "lastProcessedAt"
      FROM meetings
      WHERE 
        stripe_payout_id IS NOT NULL OR 
        stripe_payout_amount IS NOT NULL OR
        "lastProcessedAt" IS NOT NULL
      LIMIT 5;
    `;
    console.table(sample);
  } else {
    console.log('\n✅ ALL PAYOUT FIELDS ARE NULL!');
    console.log('   Safe to remove from WorkOS schema.');
  }

  await sql.end();
}

checkPayoutData().catch(console.error);
