#!/usr/bin/env tsx
import { db } from '@/drizzle/db';
import { sql } from 'drizzle-orm';

/**
 * Script to clean up duplicate slot reservations
 *
 * This script:
 * 1. Identifies duplicate reservations (same event_id, start_time, guest_email)
 * 2. Keeps only the most recent reservation for each duplicate group
 * 3. Deletes the older duplicates with verification
 * 4. Reports actual vs expected deletion counts for accuracy
 *
 * IMPROVEMENTS:
 * - ✅ Verifies delete operation success by checking actual deleted row count
 * - ✅ Uses RETURNING clause to confirm deletions
 * - ✅ Warns if expected vs actual deletion counts don't match
 * - ✅ Removed unused imports for cleaner code
 *
 * This should be run BEFORE applying the unique constraint migration.
 */

async function cleanupDuplicateReservations() {
  console.log('🧹 Starting cleanup of duplicate slot reservations...');

  try {
    // First, let's see what duplicates we have
    const duplicatesQuery = sql`
      SELECT 
        event_id,
        start_time,
        guest_email,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(id ORDER BY created_at DESC) as reservation_ids,
        ARRAY_AGG(created_at ORDER BY created_at DESC) as creation_times
      FROM slot_reservations 
      GROUP BY event_id, start_time, guest_email 
      HAVING COUNT(*) > 1
    `;

    const duplicates = await db.execute(duplicatesQuery);

    console.log(`Found ${duplicates.rows.length} groups of duplicate reservations`);

    if (duplicates.rows.length === 0) {
      console.log('✅ No duplicate reservations found. Nothing to clean up.');
      return;
    }

    // Log details about duplicates
    for (const duplicate of duplicates.rows) {
      console.log(
        `
📊 Duplicate group:
   Event ID: ${duplicate.event_id}
   Start Time: ${duplicate.start_time}
   Guest Email: ${duplicate.guest_email}
   Count: ${duplicate.duplicate_count}
   Reservation IDs: ${duplicate.reservation_ids}
   Creation Times: ${duplicate.creation_times}
      `.trim(),
      );
    }

    // For each duplicate group, keep the most recent and delete the rest
    let totalDeleted = 0;

    for (const duplicate of duplicates.rows) {
      const reservationIds = duplicate.reservation_ids as string[];
      const [keepId, ...deleteIds] = reservationIds; // First ID is most recent due to ORDER BY created_at DESC

      if (deleteIds.length > 0) {
        console.log(
          `
🗑️  Cleaning up duplicates for slot:
   Keeping: ${keepId} (most recent)
   Deleting: ${deleteIds.join(', ')}
        `.trim(),
        );

        // Delete the older duplicates
        const deleteQuery = sql`
          DELETE FROM slot_reservations 
          WHERE id = ANY(${deleteIds})
          RETURNING id
        `;

        const result = await db.execute(deleteQuery);
        const deletedCount = result.rows.length;
        totalDeleted += deletedCount;

        console.log(
          `   ✅ Deleted ${deletedCount} duplicate reservations (expected: ${deleteIds.length})`,
        );

        if (deletedCount !== deleteIds.length) {
          console.warn(
            `   ⚠️  Expected to delete ${deleteIds.length} but only deleted ${deletedCount}`,
          );
        }
      }
    }

    console.log(
      `
🎉 Cleanup completed successfully!
   Total duplicate reservations deleted: ${totalDeleted}
   Unique slot reservations remaining: ${duplicates.rows.length}
    `.trim(),
    );

    // Verify no duplicates remain
    const remainingDuplicates = await db.execute(duplicatesQuery);

    if (remainingDuplicates.rows.length === 0) {
      console.log('✅ Verification: No duplicate reservations remain in the database.');
    } else {
      console.error('❌ Warning: Some duplicates may still exist:', remainingDuplicates.rows);
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupDuplicateReservations()
    .then(() => {
      console.log('🏁 Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { cleanupDuplicateReservations };
