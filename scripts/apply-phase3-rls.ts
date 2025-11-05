/**
 * Apply Phase 3 RLS Policies
 *
 * Applies Row-Level Security policies for expert_setup and user_preferences tables
 * using the Standard Approach (SET LOCAL + app.current_user_id())
 *
 * Prerequisites:
 * - 001_enable_rls_standard.sql must have been applied (creates app schema)
 * - Phase 3 tables must exist (expert_setup, user_preferences)
 *
 * Usage: pnpm tsx scripts/apply-phase3-rls.ts
 */
import 'dotenv/config';
import { sql } from 'drizzle-orm';

import { db } from '../drizzle/db';

async function applyPhase3RLS() {
  console.log('🔒 Applying Phase 3 RLS policies...\n');

  // Verify DATABASE_URL is loaded
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    process.exit(1);
  }

  try {
    // 1. Enable RLS on tables
    console.log('1. Enabling Row-Level Security...');
    await db.execute(sql`ALTER TABLE expert_setup ENABLE ROW LEVEL SECURITY;`);
    await db.execute(sql`ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;`);
    console.log('   ✅ RLS enabled on expert_setup and user_preferences\n');

    // 2. Expert Setup Policies
    console.log('2. Creating expert_setup policies...');

    // Drop existing policies if they exist
    await db.execute(sql`
      DROP POLICY IF EXISTS "Users can view own expert setup" ON expert_setup;
    `);
    await db.execute(sql`
      DROP POLICY IF EXISTS "Users can create own expert setup" ON expert_setup;
    `);
    await db.execute(sql`
      DROP POLICY IF EXISTS "Users can update own expert setup" ON expert_setup;
    `);
    await db.execute(sql`
      DROP POLICY IF EXISTS "Users can delete own expert setup" ON expert_setup;
    `);

    // Create policies
    await db.execute(sql`
      CREATE POLICY "Users can view own expert setup"
        ON expert_setup
        FOR SELECT
        USING (workos_user_id = app.current_user_id());
    `);

    await db.execute(sql`
      CREATE POLICY "Users can create own expert setup"
        ON expert_setup
        FOR INSERT
        WITH CHECK (workos_user_id = app.current_user_id());
    `);

    await db.execute(sql`
      CREATE POLICY "Users can update own expert setup"
        ON expert_setup
        FOR UPDATE
        USING (workos_user_id = app.current_user_id())
        WITH CHECK (workos_user_id = app.current_user_id());
    `);

    await db.execute(sql`
      CREATE POLICY "Users can delete own expert setup"
        ON expert_setup
        FOR DELETE
        USING (workos_user_id = app.current_user_id());
    `);

    console.log('   ✅ Created 4 policies for expert_setup\n');

    // 3. User Preferences Policies
    console.log('3. Creating user_preferences policies...');

    // Drop existing policies if they exist
    await db.execute(sql`
      DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
    `);
    await db.execute(sql`
      DROP POLICY IF EXISTS "Users can create own preferences" ON user_preferences;
    `);
    await db.execute(sql`
      DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
    `);
    await db.execute(sql`
      DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;
    `);

    // Create policies
    await db.execute(sql`
      CREATE POLICY "Users can view own preferences"
        ON user_preferences
        FOR SELECT
        USING (workos_user_id = app.current_user_id());
    `);

    await db.execute(sql`
      CREATE POLICY "Users can create own preferences"
        ON user_preferences
        FOR INSERT
        WITH CHECK (workos_user_id = app.current_user_id());
    `);

    await db.execute(sql`
      CREATE POLICY "Users can update own preferences"
        ON user_preferences
        FOR UPDATE
        USING (workos_user_id = app.current_user_id())
        WITH CHECK (workos_user_id = app.current_user_id());
    `);

    await db.execute(sql`
      CREATE POLICY "Users can delete own preferences"
        ON user_preferences
        FOR DELETE
        USING (workos_user_id = app.current_user_id());
    `);

    console.log('   ✅ Created 4 policies for user_preferences\n');

    // 4. Verify RLS is enabled
    console.log('4. Verifying RLS configuration...');
    const rlsStatus = await db.execute(sql`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE tablename IN ('expert_setup', 'user_preferences')
      ORDER BY tablename;
    `);

    console.log('   RLS Status:');
    rlsStatus.rows.forEach((row: any) => {
      const status = row.rowsecurity ? '✅ Enabled' : '❌ Disabled';
      console.log(`   - ${row.tablename}: ${status}`);
    });

    // 5. Verify policies exist
    console.log('\n5. Verifying policies...');
    const policies = await db.execute(sql`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE tablename IN ('expert_setup', 'user_preferences')
      ORDER BY tablename, policyname;
    `);

    console.log(`   Found ${policies.rows.length} policies:`);
    policies.rows.forEach((row: any) => {
      console.log(`   - ${row.tablename}: ${row.policyname}`);
    });

    console.log('\n✅ Phase 3 RLS policies applied successfully!\n');

    console.log('📊 Summary:');
    console.log('─────────────────────────────────────────');
    console.log('Tables Protected:    2 (expert_setup, user_preferences)');
    console.log('Policies Created:    8 (4 per table)');
    console.log('Security Model:      User-scoped (workos_user_id)');
    console.log('Implementation:      Standard Approach (SET LOCAL)');
    console.log('Context Function:    app.current_user_id()');
    console.log('─────────────────────────────────────────\n');

    console.log('🧪 Test RLS (in a transaction):');
    console.log('```sql');
    console.log('BEGIN;');
    console.log("SET LOCAL app.user_id = 'user_01K8QT17KX25XPHVQ4H1K0HTR7';");
    console.log('SELECT * FROM expert_setup;  -- Should only see own record');
    console.log('SELECT * FROM user_preferences;  -- Should only see own record');
    console.log('ROLLBACK;');
    console.log('```\n');

    console.log('✨ Ready to test! The setup page should now have RLS protection.\n');
  } catch (error) {
    console.error('❌ RLS policy application failed:', error);
    process.exit(1);
  }
}

applyPhase3RLS()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
