#!/usr/bin/env tsx
import postgres from 'postgres';

const legacyDbUrl = process.env.DATABASE_URL_LEGACY || process.env.DATABASE_URL;

if (!legacyDbUrl) {
  console.error('❌ DATABASE_URL_LEGACY not set');
  process.exit(1);
}

const sql = postgres(legacyDbUrl, { max: 1 });

async function checkColumns() {
  console.log('🔍 Checking meetings table structure...\n');

  const columns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'meetings'
    ORDER BY ordinal_position;
  `;

  console.log('Columns in legacy meetings table:');
  console.log('='.repeat(80));
  columns.forEach((col: any) => {
    console.log(
      `${col.column_name.padEnd(40)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`,
    );
  });
  console.log('='.repeat(80));
  console.log(`\nTotal columns: ${columns.length}\n`);

  // Check for payout columns
  const payoutCols = columns.filter(
    (col: any) => col.column_name.includes('Payout') || col.column_name === 'lastProcessedAt',
  );

  if (payoutCols.length === 0) {
    console.log('✅ CONFIRMED: No payout fields exist in legacy database');
    console.log('   This means they were NEVER deployed to production.');
    console.log('   Safe to proceed with WorkOS schema (which also removes them).\n');
  } else {
    console.log('⚠️  Found payout columns:');
    payoutCols.forEach((col: any) => console.log(`   • ${col.column_name}`));
  }

  await sql.end();
}

checkColumns().catch(console.error);
