/**
 * Backfill Migration: Populate guestWorkosUserId for existing meetings
 *
 * This script:
 * 1. Finds all meetings where guestWorkosUserId is NULL (legacy records)
 * 2. For each, calls createOrGetGuestUser to create/find WorkOS shadow user
 * 3. Updates the meeting with guestWorkosUserId and guestOrgId
 * 4. Also backfills SlotReservationsTable and RecordsTable
 *
 * Originally at: drizzle/backfill-guest-workos-users.ts
 * Run with: bun scripts/utilities/archive/backfill/backfill-guest-workos-users.ts
 *
 * IMPORTANT: Run this BEFORE making guestWorkosUserId NOT NULL in the schema,
 * or use the schema with the column still nullable.
 */

import { db } from '@/drizzle/db';
import { MeetingsTable, SlotReservationsTable, RecordsTable } from '@/drizzle/schema';
import { createOrGetGuestUser } from '@/lib/integrations/workos/guest-users';
import { isNull, eq, sql } from 'drizzle-orm';

async function backfillMeetings() {
  console.log('=== Backfill: Meetings with missing guestWorkosUserId ===');

  const meetings = await db
    .select({
      id: MeetingsTable.id,
      guestEmail: MeetingsTable.guestEmail,
      guestName: MeetingsTable.guestName,
    })
    .from(MeetingsTable)
    .where(isNull(MeetingsTable.guestWorkosUserId));

  console.log(`Found ${meetings.length} meetings to backfill`);

  let success = 0;
  let failed = 0;

  for (const meeting of meetings) {
    try {
      const result = await createOrGetGuestUser({
        email: meeting.guestEmail,
        name: meeting.guestName,
        metadata: { registrationSource: 'backfill_migration' },
      });

      await db
        .update(MeetingsTable)
        .set({
          guestWorkosUserId: result.userId,
          guestOrgId: result.organizationId,
        })
        .where(eq(MeetingsTable.id, meeting.id));

      success++;
      if (success % 10 === 0) {
        console.log(`  Progress: ${success}/${meetings.length}`);
      }
    } catch (error) {
      failed++;
      console.error(`  Failed for meeting ${meeting.id} (${meeting.guestEmail}):`, error);
    }
  }

  console.log(`Meetings: ${success} succeeded, ${failed} failed out of ${meetings.length}`);
}

async function backfillSlotReservations() {
  console.log('\n=== Backfill: SlotReservations with missing guestWorkosUserId ===');

  const reservations = await db
    .select({
      id: SlotReservationsTable.id,
      guestEmail: SlotReservationsTable.guestEmail,
    })
    .from(SlotReservationsTable)
    .where(sql`${SlotReservationsTable.guestWorkosUserId} IS NULL OR ${SlotReservationsTable.guestWorkosUserId} = ''`);

  console.log(`Found ${reservations.length} reservations to backfill`);

  let success = 0;
  let failed = 0;

  for (const reservation of reservations) {
    try {
      const result = await createOrGetGuestUser({
        email: reservation.guestEmail,
        name: 'Guest',
        metadata: { registrationSource: 'backfill_migration' },
      });

      await db
        .update(SlotReservationsTable)
        .set({ guestWorkosUserId: result.userId })
        .where(eq(SlotReservationsTable.id, reservation.id));

      success++;
    } catch (error) {
      failed++;
      console.error(`  Failed for reservation ${reservation.id}:`, error);
    }
  }

  console.log(`Reservations: ${success} succeeded, ${failed} failed out of ${reservations.length}`);
}

async function backfillRecords() {
  console.log('\n=== Backfill: Records with missing guestWorkosUserId ===');

  const records = await db
    .select({
      id: RecordsTable.id,
      guestEmail: RecordsTable.guestEmail,
    })
    .from(RecordsTable)
    .where(sql`${RecordsTable.guestWorkosUserId} IS NULL OR ${RecordsTable.guestWorkosUserId} = ''`);

  console.log(`Found ${records.length} records to backfill`);

  let success = 0;
  let failed = 0;

  for (const record of records) {
    try {
      const result = await createOrGetGuestUser({
        email: record.guestEmail,
        name: 'Guest',
        metadata: { registrationSource: 'backfill_migration' },
      });

      await db
        .update(RecordsTable)
        .set({ guestWorkosUserId: result.userId })
        .where(eq(RecordsTable.id, record.id));

      success++;
    } catch (error) {
      failed++;
      console.error(`  Failed for record ${record.id}:`, error);
    }
  }

  console.log(`Records: ${success} succeeded, ${failed} failed out of ${records.length}`);
}

async function main() {
  console.log('Starting guest WorkOS user backfill migration...\n');
  console.log('This will create shadow WorkOS users for all existing guests');
  console.log('and populate guestWorkosUserId/guestOrgId columns.\n');

  await backfillMeetings();
  await backfillSlotReservations();
  await backfillRecords();

  console.log('\n=== Backfill complete ===');
  console.log('Next steps:');
  console.log('1. Verify all records have guestWorkosUserId populated');
  console.log('2. Make guestWorkosUserId NOT NULL in schema');
  console.log('3. Run db:generate and db:push');
  console.log('4. After verification, drop guestEmail/guestName/guestNotes columns');

  process.exit(0);
}

main().catch((error) => {
  console.error('Backfill migration failed:', error);
  process.exit(1);
});
