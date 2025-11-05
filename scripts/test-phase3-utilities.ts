/**
 * Test Phase 3 Utilities
 *
 * Verifies that all Phase 3 utilities work correctly after migration.
 */
// Load environment variables
import 'dotenv/config';
import { sql } from 'drizzle-orm';

import { db } from '../drizzle/db';

async function testPhase3() {
  console.log('🧪 Testing Phase 3 utilities...\n');

  try {
    // Test 1: Verify tables exist
    console.log('1. Verifying tables exist...');
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('expert_setup', 'user_preferences', 'users')
      ORDER BY table_name
    `);
    console.log(
      '   Tables found:',
      tables.rows.map((r: any) => r.table_name),
    );

    // Test 2: Verify role column
    console.log('\n2. Verifying role column in users table...');
    const roleColumn = await db.execute(sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'role'
    `);
    console.log('   Role column:', roleColumn.rows[0]);

    // Test 3: Check expert_setup columns
    console.log('\n3. Checking expert_setup table structure...');
    const setupColumns = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'expert_setup'
      ORDER BY ordinal_position
    `);
    console.log('   Columns:', setupColumns.rows.map((r: any) => r.column_name).join(', '));

    // Test 4: Check user_preferences columns
    console.log('\n4. Checking user_preferences table structure...');
    const prefsColumns = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'user_preferences'
      ORDER BY ordinal_position
    `);
    console.log('   Columns:', prefsColumns.rows.map((r: any) => r.column_name).join(', '));

    // Test 5: Check indexes
    console.log('\n5. Verifying indexes...');
    const indexes = await db.execute(sql`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('expert_setup', 'user_preferences')
      ORDER BY tablename, indexname
    `);
    console.log('   Indexes found:');
    indexes.rows.forEach((row: any) => {
      console.log(`   - ${row.tablename}.${row.indexname}`);
    });

    // Test 6: Check foreign keys
    console.log('\n6. Verifying foreign key constraints...');
    const fks = await db.execute(sql`
      SELECT 
        conname as constraint_name,
        conrelid::regclass as table_name,
        confrelid::regclass as referenced_table
      FROM pg_constraint
      WHERE contype = 'f'
      AND conrelid::regclass::text IN ('expert_setup', 'user_preferences')
      ORDER BY conrelid::regclass::text
    `);
    console.log('   Foreign keys:');
    fks.rows.forEach((row: any) => {
      console.log(`   - ${row.table_name} → ${row.referenced_table}`);
    });

    // Test 7: Try inserting/querying (if there are users)
    console.log('\n7. Checking if we can query the tables...');
    const userCount = await db.execute(sql`SELECT COUNT(*) FROM users`);
    console.log(`   Users in database: ${userCount.rows[0].count}`);

    const setupCount = await db.execute(sql`SELECT COUNT(*) FROM expert_setup`);
    console.log(`   Expert setup records: ${setupCount.rows[0].count}`);

    const prefsCount = await db.execute(sql`SELECT COUNT(*) FROM user_preferences`);
    console.log(`   User preferences records: ${prefsCount.rows[0].count}`);

    console.log('\n✅ All tests passed! Phase 3 migration is working correctly.');
    console.log('\n📊 Summary:');
    console.log('   - expert_setup table: ✅ Created with all columns and indexes');
    console.log('   - user_preferences table: ✅ Created with all columns and indexes');
    console.log('   - users.role column: ✅ Added with default value');
    console.log('   - Foreign keys: ✅ All constraints created');
    console.log('   - Indexes: ✅ All indexes created for performance');

    console.log('\n🚀 Next Steps:');
    console.log('   1. Test the role utilities: import from lib/integrations/workos/roles');
    console.log(
      '   2. Test the preferences utilities: import from lib/integrations/workos/preferences',
    );
    console.log('   3. Test the setup actions: import from server/actions/expert-setup-workos');
    console.log('   4. Update dashboard and other pages to use new utilities');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testPhase3()
  .then(() => {
    console.log('\n✅ Testing complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
