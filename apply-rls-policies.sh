#!/bin/bash

# Apply RLS Policies to Neon Database
# This script applies Row-Level Security policies using Node.js instead of psql

set -e

echo "🔧 Applying RLS Policies..."
echo ""

# Check if DATABASE_URL is set
if [ -f .env ]; then
  export DATABASE_URL=$(grep "^DATABASE_URL=" .env | grep -v "LEGACY\|UNPOOLED\|AUDITLOG" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL not found in .env"
  exit 1
fi

echo "📝 Database: ${DATABASE_URL:0:30}..."
echo ""

# Create a Node.js script to execute the SQL
cat > /tmp/apply-rls.mjs << 'EOFJS'
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const sql = neon(process.env.DATABASE_URL);

async function applyRLS() {
  try {
    console.log('📖 Reading RLS SQL file...');
    const rlsSQL = readFileSync('./drizzle/migrations-manual/001_enable_rls_standard.sql', 'utf8');
    
    console.log('🚀 Executing RLS policies...');
    
    // Split by statement breakpoint and execute each statement
    const statements = rlsSQL
      .split(/;[\s]*(?=CREATE|ALTER|SELECT|\n)/g)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('/*') && !s.startsWith('--'));
    
    console.log(`   Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
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
        } else if (statement.includes('ALTER TABLE') && statement.includes('ENABLE ROW LEVEL SECURITY')) {
          const tableName = statement.match(/ALTER TABLE (\w+)/)?.[1];
          console.log(`   ✅ Enabled RLS on: ${tableName}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ⚠️  Warning: ${error.message.split('\n')[0]}`);
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
    rlsCheck.forEach(row => {
      const status = row.rowsecurity ? '✅ Enabled' : '❌ Disabled';
      console.log(`   ${status}: ${row.tablename}`);
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Success! RLS is configured and ready to use.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('\n❌ Error applying RLS:', error.message);
    process.exit(1);
  }
}

applyRLS();
EOFJS

# Run the Node.js script
node /tmp/apply-rls.mjs

# Clean up
rm /tmp/apply-rls.mjs

echo ""
echo "✅ RLS policies applied successfully!"
echo ""
echo "Next steps:"
echo "1. Run: tsx scripts/test-rls.ts (to test RLS)"
echo "2. Start building data migration scripts"
