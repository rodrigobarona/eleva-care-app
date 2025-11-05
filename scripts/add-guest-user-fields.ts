#!/usr/bin/env tsx
/**
 * Add guest user fields to meetings table
 *
 * This script safely adds the guest_workos_user_id and guest_org_id fields
 * to the meetings table without conflicting with existing migrations.
 */
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

async function addGuestUserFields() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log('🔍 Checking current meetings table structure...');

  const columns = await sql`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'meetings' 
    AND column_name IN ('guest_workos_user_id', 'guest_org_id')
  `;

  if (columns.length === 2) {
    console.log('✅ Guest user fields already exist:');
    console.table(columns);
    console.log('No changes needed.');
    return;
  }

  console.log('📝 Adding guest user fields to meetings table...');
  console.log('');

  // Add guest_workos_user_id
  if (!columns.find((c) => c.column_name === 'guest_workos_user_id')) {
    await sql`ALTER TABLE meetings ADD COLUMN guest_workos_user_id text`;
    console.log('✅ Added guest_workos_user_id column');
  } else {
    console.log('⏭️  guest_workos_user_id already exists, skipping');
  }

  // Add guest_org_id
  if (!columns.find((c) => c.column_name === 'guest_org_id')) {
    await sql`ALTER TABLE meetings ADD COLUMN guest_org_id uuid`;
    console.log('✅ Added guest_org_id column');
  } else {
    console.log('⏭️  guest_org_id already exists, skipping');
  }

  // Create indexes
  console.log('');
  console.log('📊 Creating indexes...');

  await sql`CREATE INDEX IF NOT EXISTS meetings_guest_user_id_idx ON meetings(guest_workos_user_id)`;
  console.log('✅ Created index on guest_workos_user_id');

  await sql`CREATE INDEX IF NOT EXISTS meetings_guest_org_id_idx ON meetings(guest_org_id)`;
  console.log('✅ Created index on guest_org_id');

  console.log('');
  console.log('🎉 Migration complete! Verifying...');
  console.log('');

  const verify = await sql`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'meetings' 
    AND column_name IN ('guest_workos_user_id', 'guest_org_id')
    ORDER BY column_name
  `;

  console.table(verify);

  console.log('');
  console.log('✅ All guest user fields are in place!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Test guest booking flow');
  console.log('2. Verify WorkOS user creation');
  console.log('3. Check logs for "📝 Auto-registering guest user in WorkOS..."');
}

addGuestUserFields()
  .then(() => {
    console.log('');
    console.log('👍 Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('');
    console.error('❌ Migration failed:', err.message);
    console.error('');
    console.error('Stack:', err.stack);
    process.exit(1);
  });
