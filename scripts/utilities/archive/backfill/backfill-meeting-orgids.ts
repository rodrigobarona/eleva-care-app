/**
 * Backfill Script: Populate orgId on meetings for commission tracking
 *
 * One-time migration to set the expert's organization ID on existing meetings
 * where orgId IS NULL. This enables commission calculations to attribute
 * revenue to the correct organization.
 *
 * For each meeting with orgId IS NULL:
 * 1. Look up the expert's org via UserOrgMembershipsTable using meeting.workosUserId
 * 2. Update the meeting with the resolved orgId
 *
 * Usage: bun drizzle/backfill-meeting-orgids.ts
 */

import { db } from '@/drizzle/db';
import { MeetingsTable, UserOrgMembershipsTable } from '@/drizzle/schema';
import { eq, isNull } from 'drizzle-orm';

const BATCH_SIZE = 100;

interface BackfillResult {
  total: number;
  updated: number;
  skipped: number;
  errors: Array<{ meetingId: string; error: string }>;
}

async function backfillMeetingOrgIds(): Promise<BackfillResult> {
  const result: BackfillResult = { total: 0, updated: 0, skipped: 0, errors: [] };

  console.log('🔄 Starting meeting orgId backfill...\n');

  const meetings = await db
    .select({
      id: MeetingsTable.id,
      workosUserId: MeetingsTable.workosUserId,
    })
    .from(MeetingsTable)
    .where(isNull(MeetingsTable.orgId));

  result.total = meetings.length;
  console.log(`📊 Found ${meetings.length} meetings without orgId\n`);

  for (let i = 0; i < meetings.length; i += BATCH_SIZE) {
    const batch = meetings.slice(i, i + BATCH_SIZE);

    for (const meeting of batch) {
      try {
        const membership = await db.query.UserOrgMembershipsTable.findFirst({
          where: eq(UserOrgMembershipsTable.workosUserId, meeting.workosUserId),
          columns: { orgId: true },
        });

        const expertOrgId = membership?.orgId ?? null;

        if (!expertOrgId) {
          console.log(`⏭️  Skipping meeting ${meeting.id} - no org found for expert ${meeting.workosUserId}`);
          result.skipped++;
          continue;
        }

        await db
          .update(MeetingsTable)
          .set({ orgId: expertOrgId })
          .where(eq(MeetingsTable.id, meeting.id));

        result.updated++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Error updating meeting ${meeting.id}: ${errorMessage}`);
        result.errors.push({ meetingId: meeting.id, error: errorMessage });
      }
    }

    if (i + BATCH_SIZE < meetings.length) {
      console.log(`  Progress: ${Math.min(i + BATCH_SIZE, meetings.length)}/${meetings.length}`);
    }
  }

  return result;
}

backfillMeetingOrgIds()
  .then((result) => {
    console.log('\n📊 Backfill Complete:');
    console.log(`   Total meetings found: ${result.total}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Skipped (no org found): ${result.skipped}`);
    console.log(`   Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      for (const err of result.errors) {
        console.log(`   - Meeting ${err.meetingId}: ${err.error}`);
      }
    }

    process.exit(result.errors.length > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
