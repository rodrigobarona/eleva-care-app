/**
 * Apply RLS Policies to Neon Database
 * Properly handles multi-line SQL statements with dollar-quoted strings
 * Run with: pnpm tsx scripts/apply-rls-final.ts
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

/**
 * Split SQL into statements, preserving dollar-quoted function bodies
 */
function splitSQL(sqlText: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';

  const lines = sqlText.split('\n');

  for (let line of lines) {
    // Skip comments
    if (line.trim().startsWith('--')) continue;

    // Check for dollar-quoted strings ($$, $tag$, etc.)
    const dollarMatches = line.match(/\$\w*\$/g);
    if (dollarMatches) {
      for (const match of dollarMatches) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = match;
        } else if (match === dollarTag) {
          inDollarQuote = false;
          dollarTag = '';
        }
      }
    }

    current += line + '\n';

    // If we're not in a dollar-quote and line ends with semicolon, it's a statement end
    if (!inDollarQuote && line.trim().endsWith(';')) {
      const stmt = current.trim();
      if (stmt.length > 5 && !stmt.startsWith('/*')) {
        statements.push(stmt);
      }
      current = '';
    }
  }

  // Add remaining content if any
  if (current.trim().length > 5) {
    statements.push(current.trim());
  }

  return statements;
}

async function applyRLS() {
  console.log('🔧 Applying RLS Policies...\n');

  const rlsSQL = readFileSync(
    join(process.cwd(), 'drizzle/migrations-manual/001_enable_rls_standard.sql'),
    'utf8',
  );

  const statements = splitSQL(rlsSQL);
  console.log(`📝 Found ${statements.length} SQL statements\n`);

  let success = 0;
  let skipped = 0;

  for (const stmt of statements) {
    // Skip verification queries
    if (
      stmt.includes('SELECT tablename') ||
      stmt.includes('SELECT routine_name') ||
      stmt.includes('SELECT auth.user_id()')
    ) {
      skipped++;
      continue;
    }

    try {
      await sql(stmt);
      success++;

      // Show progress
      if (stmt.includes('CREATE SCHEMA')) {
        console.log('   ✅ Created app schema');
      } else if (stmt.includes('CREATE OR REPLACE FUNCTION')) {
        const name = stmt.match(/FUNCTION\s+(\w+\.\w+)/)?.[1];
        console.log(`   ✅ Function: ${name}`);
      } else if (stmt.includes('ALTER TABLE') && stmt.includes('ENABLE ROW LEVEL SECURITY')) {
        const name = stmt.match(/ALTER TABLE\s+(\w+)/)?.[1];
        console.log(`   ✅ RLS enabled: ${name}`);
      } else if (stmt.includes('CREATE POLICY')) {
        const name = stmt.match(/CREATE POLICY\s+"?(\w+)"?/)?.[1];
        console.log(`   ✅ Policy: ${name}`);
      }
    } catch (error: any) {
      const msg = error.message.split('\n')[0];
      if (!msg.includes('already exists')) {
        console.error(`   ⚠️  ${msg}`);
      }
    }
  }

  console.log(`\n   Executed: ${success}, Skipped: ${skipped}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Verifying Setup...\n');

  // Check RLS
  const rlsCheck = await sql`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  `;

  const enabled = rlsCheck.filter((r) => r.rowsecurity).length;
  console.log(`📊 RLS: ${enabled}/${rlsCheck.length} tables enabled`);

  // Check policies
  const policies = await sql`
    SELECT COUNT(*) as count 
    FROM pg_policies 
    WHERE schemaname = 'public'
  `;
  console.log(`📋 Policies: ${policies[0].count} created`);

  // Test functions
  const funcs = await sql`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'app'
  `;
  console.log(`🔧 Functions: ${funcs.length} in app schema\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 RLS Setup Complete!\n');
}

applyRLS().catch(console.error);
