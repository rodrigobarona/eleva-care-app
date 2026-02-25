/**
 * One-time migration script: Convert serial (integer) primary keys to uuid
 * for payment_transfers, scheduling_settings, and blocked_dates tables.
 *
 * Run with: bun drizzle/migrate-serial-to-uuid.ts
 * Delete this file after successful migration.
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const sql = neon(DATABASE_URL);

const tables = ['payment_transfers', 'scheduling_settings', 'blocked_dates'] as const;

async function migrateTable(tableName: string) {
  console.log(`\n--- Migrating ${tableName}.id from serial → uuid ---`);

  const colCheck = await sql`
    SELECT data_type FROM information_schema.columns
    WHERE table_name = ${tableName} AND column_name = 'id'
  `;

  if (colCheck.length === 0) {
    console.log(`  ⚠️  Table ${tableName} not found, skipping`);
    return;
  }

  const currentType = colCheck[0].data_type;
  if (currentType === 'uuid') {
    console.log(`  ✅ Already uuid, skipping`);
    return;
  }

  console.log(`  Current type: ${currentType} → converting to uuid`);

  // Step 1: Add new uuid column
  await sql`ALTER TABLE ${sql(tableName)} ADD COLUMN new_id uuid DEFAULT gen_random_uuid() NOT NULL`;
  console.log(`  1/5 Added new_id column`);

  // Step 2: Drop old primary key
  await sql`ALTER TABLE ${sql(tableName)} DROP CONSTRAINT ${sql(`${tableName}_pkey`)}`;
  console.log(`  2/5 Dropped old primary key`);

  // Step 3: Drop old id column
  await sql`ALTER TABLE ${sql(tableName)} DROP COLUMN id`;
  console.log(`  3/5 Dropped old id column`);

  // Step 4: Rename new_id to id
  await sql`ALTER TABLE ${sql(tableName)} RENAME COLUMN new_id TO id`;
  console.log(`  4/5 Renamed new_id → id`);

  // Step 5: Add primary key constraint
  await sql`ALTER TABLE ${sql(tableName)} ADD PRIMARY KEY (id)`;
  console.log(`  5/5 Added primary key constraint`);

  // Step 6: Drop sequence (from serial)
  try {
    await sql`DROP SEQUENCE IF EXISTS ${sql(`${tableName}_id_seq`)}`;
    console.log(`  🗑️  Dropped sequence ${tableName}_id_seq`);
  } catch {
    console.log(`  ℹ️  No sequence to drop`);
  }

  console.log(`  ✅ ${tableName} migration complete`);
}

async function main() {
  console.log('🔄 Starting serial → uuid migration...\n');

  for (const table of tables) {
    try {
      await migrateTable(table);
    } catch (error) {
      console.error(`❌ Failed to migrate ${table}:`, error);
      process.exit(1);
    }
  }

  console.log('\n✅ All tables migrated successfully!');
  console.log('   You can now run: bun run db:push');
}

main();
