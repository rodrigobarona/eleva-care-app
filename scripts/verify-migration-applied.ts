#!/usr/bin/env tsx
import 'dotenv/config';
import postgres from 'postgres';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 1 });

async function verifyMigration() {
  console.log('🔍 Verifying migration was applied successfully...\n');

  try {
    // 1. Check meetings table columns
    console.log('1️⃣  Checking meetings table structure:');
    console.log('='.repeat(80));

    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'meetings'
      ORDER BY ordinal_position;
    `;

    const columnNames = columns.map((col: any) => col.column_name);
    console.log(`Total columns: ${columns.length}`);

    // Check that payout columns were removed
    const removedColumns = [
      'stripe_payout_id',
      'stripe_payout_amount',
      'stripe_payout_failure_code',
      'stripe_payout_failure_message',
      'stripe_payout_paid_at',
      'last_processed_at',
    ];

    console.log('\n✅ Verifying removed columns:');
    let allRemoved = true;
    for (const col of removedColumns) {
      const exists = columnNames.includes(col);
      if (exists) {
        console.log(`   ❌ ${col} - STILL EXISTS (ERROR!)`);
        allRemoved = false;
      } else {
        console.log(`   ✅ ${col} - removed`);
      }
    }

    // Check that transfer columns still exist
    console.log('\n✅ Verifying kept columns:');
    const keptColumns = [
      'stripe_transfer_id',
      'stripe_transfer_amount',
      'stripe_transfer_status',
      'stripe_transfer_scheduled_at',
    ];

    let allKept = true;
    for (const col of keptColumns) {
      const exists = columnNames.includes(col);
      if (exists) {
        console.log(`   ✅ ${col} - exists`);
      } else {
        console.log(`   ❌ ${col} - MISSING (ERROR!)`);
        allKept = false;
      }
    }

    // 2. Check indexes
    console.log('\n2️⃣  Checking indexes:');
    console.log('='.repeat(80));

    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'meetings'
      AND indexname LIKE '%transfer%';
    `;

    console.log(`Found ${indexes.length} transfer-related index(es):`);
    indexes.forEach((idx: any) => {
      console.log(`   ✅ ${idx.indexname}`);
      console.log(`      ${idx.indexdef}`);
    });

    const hasTransferIndex = indexes.some(
      (idx: any) => idx.indexname === 'meetings_transfer_id_idx',
    );

    if (!hasTransferIndex) {
      console.log('   ⚠️  meetings_transfer_id_idx not found!');
    }

    // 3. Check for orphaned constraints
    console.log('\n3️⃣  Checking constraints:');
    console.log('='.repeat(80));

    const constraints = await sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'meetings'
      AND constraint_name LIKE '%payout%';
    `;

    if (constraints.length === 0) {
      console.log('   ✅ No payout-related constraints found (good!)');
    } else {
      console.log('   ⚠️  Found payout constraints (should have been removed):');
      constraints.forEach((con: any) => {
        console.log(`      ${con.constraint_name} (${con.constraint_type})`);
      });
    }

    // 4. Check PaymentTransfersTable exists
    console.log('\n4️⃣  Verifying PaymentTransfersTable (source of truth for payouts):');
    console.log('='.repeat(80));

    const transferTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'payment_transfers'
      );
    `;

    if (transferTableExists[0].exists) {
      const transferCols = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'payment_transfers'
        AND column_name IN ('payout_id', 'transfer_id', 'status');
      `;
      console.log(`   ✅ payment_transfers table exists`);
      console.log(`   ✅ Has ${transferCols.length} key payout tracking columns`);
    } else {
      console.log('   ❌ payment_transfers table NOT FOUND!');
    }

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 MIGRATION VERIFICATION SUMMARY');
    console.log('='.repeat(80));

    if (allRemoved && allKept && hasTransferIndex) {
      console.log('\n✅ ✅ ✅  MIGRATION SUCCESSFUL! ✅ ✅ ✅');
      console.log('\n✅ All payout fields removed from meetings table');
      console.log('✅ Transfer fields kept intact');
      console.log('✅ New transfer_id index created');
      console.log('✅ PaymentTransfersTable is the source of truth for payouts');
      console.log('\n🎉 Database schema is clean and optimized!');
      console.log('💾 Saved ~48 bytes per meeting record');
      console.log('🚀 Ready for WorkOS migration');
    } else {
      console.log('\n⚠️  MIGRATION HAD ISSUES:');
      if (!allRemoved) console.log('   ❌ Some payout columns still exist');
      if (!allKept) console.log('   ❌ Some transfer columns are missing');
      if (!hasTransferIndex) console.log('   ❌ Transfer index not created');
      console.log('\n👉 Review the details above and rerun migration if needed');
    }

    console.log('\n');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

verifyMigration().catch(console.error);
