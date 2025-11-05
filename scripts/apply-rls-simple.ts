/**
 * Apply RLS Policies to Neon Database (Simplified)
 * Run with: pnpm tsx scripts/apply-rls-simple.ts
 */
import { neon } from '@neondatabase/serverless';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function applyRLS() {
  console.log('🔧 Applying RLS Policies...\n');

  const rlsSQL = readFileSync(
    join(process.cwd(), 'drizzle/migrations-manual/001_enable_rls_standard.sql'),
    'utf8',
  );

  // Remove comments and verification queries at the end
  const cleanSQL = rlsSQL
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split('-- ============================================================================')[0]
    .split('-- VERIFICATION')[0]
    .trim();

  try {
    console.log('   Executing SQL...\n');
    await sql(cleanSQL);
    console.log('   ✅ SQL executed successfully\n');
  } catch (error: any) {
    console.error('   ❌ Error:', error.message);
    throw error;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Verifying Setup...\n');

  // Check RLS
  const rlsCheck = await sql`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  `;

  console.log('📊 RLS Status:');
  const enabled = rlsCheck.filter((r) => r.rowsecurity).length;
  rlsCheck.forEach((r) => {
    console.log(`   ${r.rowsecurity ? '✅' : '❌'} ${r.tablename}`);
  });
  console.log(`\n   Total: ${enabled}/${rlsCheck.length} enabled\n`);

  // Check policies
  const policies = await sql`
    SELECT COUNT(*) as count 
    FROM pg_policies 
    WHERE schemaname = 'public'
  `;
  console.log(`📋 Policies: ${policies[0].count} created\n`);

  // Test functions
  console.log('🧪 Testing helper functions:');
  try {
    await sql`SELECT app.current_user_id()`;
    console.log('   ✅ app.current_user_id()');
  } catch (e: any) {
    console.log(`   ❌ app.current_user_id(): ${e.message.split('\n')[0]}`);
  }

  try {
    await sql`SELECT app.is_org_member(gen_random_uuid())`;
    console.log('   ✅ app.is_org_member()');
  } catch (e: any) {
    console.log(`   ❌ app.is_org_member(): ${e.message.split('\n')[0]}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 RLS Setup Complete!\n');
  console.log('Next: pnpm tsx scripts/test-rls.ts\n');
}

applyRLS().catch(console.error);
