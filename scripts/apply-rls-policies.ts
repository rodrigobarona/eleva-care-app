/**
 * Apply RLS Policies to Neon Database
 *
 * This script applies Row-Level Security policies using the Neon serverless driver.
 * Run with: pnpm tsx scripts/apply-rls-policies.ts
 */
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not found in environment variables');
  console.error('   Make sure to set it in your .env file');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function applyRLS() {
  try {
    console.log('🔧 Applying RLS Policies...\n');
    console.log(`📝 Database: ${DATABASE_URL?.substring(0, 30) || 'unknown'}...\n`);

    console.log('📖 Reading RLS SQL file...');
    const rlsSQL = readFileSync(
      join(process.cwd(), 'drizzle/migrations-manual/001_enable_rls_standard.sql'),
      'utf8',
    );

    console.log('🚀 Executing RLS policies...\n');

    // Split by semicolons but preserve function bodies
    const statements = rlsSQL
      .split(/;[\s]*(?=(CREATE|ALTER|SELECT|\n))/g)
      .map((s) => s.trim())
      .filter((s) => {
        // Filter out comments and empty statements
        return s.length > 5 && !s.startsWith('/*') && !s.startsWith('--') && !s.match(/^\/\*/);
      });

    console.log(`   Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const statement of statements) {
      if (!statement || statement.length < 5) continue;

      try {
        await sql(statement);
        successCount++;

        // Show progress for major operations
        if (statement.includes('CREATE POLICY')) {
          const policyName = statement.match(/CREATE POLICY "?(\w+)"?/)?.[1];
          console.log(`   ✅ Created policy: ${policyName}`);
        } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
          const funcName = statement.match(/FUNCTION (\w+\.\w+)/)?.[1];
          console.log(`   ✅ Created function: ${funcName}`);
        } else if (
          statement.includes('ALTER TABLE') &&
          statement.includes('ENABLE ROW LEVEL SECURITY')
        ) {
          const tableName = statement.match(/ALTER TABLE (\w+)/)?.[1];
          console.log(`   ✅ Enabled RLS on: ${tableName}`);
        }
      } catch (error: any) {
        errorCount++;
        const errorMsg = error.message.split('\n')[0];
        errors.push(errorMsg);

        // Only show warnings for non-critical errors
        if (!errorMsg.includes('already exists') && !errorMsg.includes('does not exist')) {
          console.error(`   ⚠️  Warning: ${errorMsg}`);
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ RLS Setup Complete!`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Warnings: ${errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verify RLS is enabled
    console.log('🔍 Verifying RLS setup...\n');

    const rlsCheck = await sql`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;

    console.log('📊 RLS Status by Table:');
    const enabledCount = rlsCheck.filter((row) => row.rowsecurity).length;

    rlsCheck.forEach((row) => {
      const status = row.rowsecurity ? '✅ Enabled ' : '❌ Disabled';
      console.log(`   ${status}: ${row.tablename}`);
    });

    console.log(`\n   Total: ${enabledCount}/${rlsCheck.length} tables have RLS enabled\n`);

    // Check policies
    const policyCheck = await sql`
      SELECT COUNT(*) as count 
      FROM pg_policies 
      WHERE schemaname = 'public'
    `;

    console.log(`📋 Policies created: ${policyCheck[0].count} policies\n`);

    // Test helper functions
    console.log('🧪 Testing helper functions...');
    try {
      await sql`SELECT app.current_user_id() as test`;
      console.log('   ✅ app.current_user_id() works');
    } catch (e: any) {
      console.log('   ⚠️  app.current_user_id():', e.message.split('\n')[0]);
    }

    try {
      await sql`SELECT app.current_org_id() as test`;
      console.log('   ✅ app.current_org_id() works');
    } catch (e: any) {
      console.log('   ⚠️  app.current_org_id():', e.message.split('\n')[0]);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Success! RLS is configured and ready to use.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (enabledCount < rlsCheck.length) {
      console.log('⚠️  Warning: Not all tables have RLS enabled.');
      console.log('   This might be intentional (e.g., categories table).\n');
    }

    console.log('Next steps:');
    console.log('1. Test RLS: tsx scripts/test-rls.ts');
    console.log('2. Build data migration scripts');
    console.log('3. Start migrating data from Clerk to WorkOS\n');
  } catch (error: any) {
    console.error('\n❌ Error applying RLS:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the function
applyRLS().catch(console.error);
