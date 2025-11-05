/**
 * Apply Phase 3 Migration - Roles & Permissions
 *
 * Creates:
 * - expert_setup table
 * - user_preferences table
 * - role column in users table
 */
// Load environment variables from .env file
import 'dotenv/config';
import { sql } from 'drizzle-orm';

import { db } from '../drizzle/db';

async function applyPhase3Migration() {
  console.log('🚀 Starting Phase 3 migration...\n');

  // Verify DATABASE_URL is loaded
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set!');
    console.error('Please ensure your .env file exists and contains DATABASE_URL.');
    process.exit(1);
  }

  if (process.env.DATABASE_URL.includes('placeholder')) {
    console.error('❌ ERROR: DATABASE_URL contains placeholder value!');
    console.error('Please set a valid Neon database URL in your .env file.');
    process.exit(1);
  }

  console.log('✅ Database URL loaded successfully\n');

  try {
    // 1. Create expert_setup table
    console.log('Creating expert_setup table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "expert_setup" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "workos_user_id" text NOT NULL,
        "org_id" uuid,
        "profile_completed" boolean DEFAULT false NOT NULL,
        "availability_completed" boolean DEFAULT false NOT NULL,
        "events_completed" boolean DEFAULT false NOT NULL,
        "identity_completed" boolean DEFAULT false NOT NULL,
        "payment_completed" boolean DEFAULT false NOT NULL,
        "google_account_completed" boolean DEFAULT false NOT NULL,
        "setup_complete" boolean DEFAULT false NOT NULL,
        "setup_completed_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "expert_setup_workos_user_id_unique" UNIQUE("workos_user_id")
      )
    `);
    console.log('✅ expert_setup table created\n');

    // 2. Create user_preferences table
    console.log('Creating user_preferences table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_preferences" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "workos_user_id" text NOT NULL,
        "org_id" uuid,
        "security_alerts" boolean DEFAULT true NOT NULL,
        "new_device_alerts" boolean DEFAULT false NOT NULL,
        "email_notifications" boolean DEFAULT true NOT NULL,
        "in_app_notifications" boolean DEFAULT true NOT NULL,
        "unusual_timing_alerts" boolean DEFAULT true NOT NULL,
        "location_change_alerts" boolean DEFAULT true NOT NULL,
        "theme" text DEFAULT 'light' NOT NULL,
        "language" text DEFAULT 'en' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "user_preferences_workos_user_id_unique" UNIQUE("workos_user_id")
      )
    `);
    console.log('✅ user_preferences table created\n');

    // 3. Add role column to users table (if not exists)
    console.log('Adding role column to users table...');
    await db.execute(sql`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user' NOT NULL
    `);
    console.log('✅ role column added to users table\n');

    // 4. Add foreign keys
    console.log('Adding foreign key constraints...');
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "expert_setup" ADD CONSTRAINT "expert_setup_workos_user_id_users_workos_user_id_fk" 
        FOREIGN KEY ("workos_user_id") REFERENCES "public"."users"("workos_user_id") 
        ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "expert_setup" ADD CONSTRAINT "expert_setup_org_id_organizations_id_fk" 
        FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") 
        ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_workos_user_id_users_workos_user_id_fk" 
        FOREIGN KEY ("workos_user_id") REFERENCES "public"."users"("workos_user_id") 
        ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_org_id_organizations_id_fk" 
        FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") 
        ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);
    console.log('✅ Foreign keys added\n');

    // 5. Create indexes
    console.log('Creating indexes...');
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "expert_setup_user_id_idx" ON "expert_setup" USING btree ("workos_user_id")`,
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "expert_setup_org_id_idx" ON "expert_setup" USING btree ("org_id")`,
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "expert_setup_complete_idx" ON "expert_setup" USING btree ("setup_complete")`,
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "user_preferences_user_id_idx" ON "user_preferences" USING btree ("workos_user_id")`,
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "user_preferences_org_id_idx" ON "user_preferences" USING btree ("org_id")`,
    );
    console.log('✅ Indexes created\n');

    // 6. Verify tables exist
    console.log('Verifying tables...');
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('expert_setup', 'user_preferences')
      ORDER BY table_name
    `);

    console.log('Tables found:', tables.rows);

    // 7. Verify role column
    const roleColumn = await db.execute(sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'role'
    `);

    console.log('Role column:', roleColumn.rows);

    console.log('\n✅ Phase 3 migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyPhase3Migration()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
