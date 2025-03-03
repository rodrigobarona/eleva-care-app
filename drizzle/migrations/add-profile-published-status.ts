import { db } from '@/drizzle/db';
import { sql } from 'drizzle-orm';

/**
 * Updates the profile table to rename isPublished to published
 */
export const addProfilePublishedStatus = async () => {
  try {
    // Step 1: Create the new column
    await db.execute(
      sql`ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "published" boolean NOT NULL DEFAULT false;`,
    );

    // Step 2: Copy data from old column to new column (if old column exists)
    await db.execute(
      sql`DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'profiles' AND column_name = 'isPublished'
        ) THEN
          UPDATE "profiles" SET "published" = "isPublished";
        END IF;
      END $$;`,
    );

    // Step 3: Drop the old column if it exists
    await db.execute(sql`ALTER TABLE "profiles" DROP COLUMN IF EXISTS "isPublished";`);

    console.log('Successfully updated profile table with published field');
    return { success: true };
  } catch (error) {
    console.error('Failed to update profile table:', error);
    return { success: false, error };
  }
};

// Run the migration if this file is executed directly
if (require.main === module) {
  addProfilePublishedStatus().catch(console.error);
}
