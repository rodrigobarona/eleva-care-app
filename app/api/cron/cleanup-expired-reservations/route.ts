/**
 * Cleanup Expired Slot Reservations Cron Job
 *
 * Removes expired and duplicate slot reservations to keep the system clean.
 * Runs periodically via QStash to release appointment slots that were
 * reserved but never paid for (e.g., abandoned Multibanco payments).
 *
 * @route GET /api/cron/cleanup-expired-reservations
 *
 * ## Tasks Performed
 * - Identifies slot reservations past their expiration time
 * - Removes expired reservations from the database
 * - Detects and removes duplicate reservations (same event, time, guest)
 * - Logs detailed information about deleted reservations
 * - Reports to BetterStack heartbeat for monitoring
 *
 * ## Authentication
 * Supports multiple authentication methods (in priority order):
 * 1. QStash signature verification
 * 2. API key header (x-api-key)
 * 3. Upstash signature headers
 * 4. Legacy cron secret (x-cron-secret)
 *
 * @example Response
 * ```json
 * {
 *   "status": "OK",
 *   "deletedReservations": 3,
 *   "deletedDuplicates": 1,
 *   "timestamp": "2026-01-21T12:00:00.000Z"
 * }
 * ```
 */
import { ENV_CONFIG } from '@/config/env';
import { db } from '@/drizzle/db';
import { SlotReservationTable } from '@/drizzle/schema';
import {
  sendHeartbeatFailure,
  sendHeartbeatSuccess,
} from '@/lib/integrations/betterstack/heartbeat';
import { isVerifiedQStashRequest } from '@/lib/integrations/qstash/utils';
import { lt, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Route segment config
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Log all headers for debugging
  console.log(
    'Received request to cleanup-expired-reservations with headers:',
    Object.fromEntries(request.headers.entries()),
  );

  // Enhanced authentication with multiple fallbacks
  // First try QStash verification
  const verifiedQStash = await isVerifiedQStashRequest(request.headers);

  // Check for API key as a fallback
  const apiKey = request.headers.get('x-api-key');
  const isValidApiKey = apiKey && apiKey === process.env.CRON_API_KEY;

  // Check for Upstash signatures directly
  const hasUpstashSignature =
    request.headers.has('upstash-signature') || request.headers.has('x-upstash-signature');

  // Check for Upstash user agent
  const userAgent = request.headers.get('user-agent') || '';
  const isUpstashUserAgent =
    userAgent.toLowerCase().includes('upstash') || userAgent.toLowerCase().includes('qstash');

  // Check for legacy cron secret
  const cronSecret = request.headers.get('x-cron-secret');
  const isValidCronSecret = cronSecret && cronSecret === process.env.CRON_SECRET;

  // If in production, we can use a fallback mode for emergencies
  const isProduction = process.env.NODE_ENV === 'production';
  const allowFallback = process.env.ENABLE_CRON_FALLBACK === 'true';

  // Allow the request if any authentication method succeeds
  if (
    verifiedQStash ||
    isValidApiKey ||
    isValidCronSecret ||
    (hasUpstashSignature && isUpstashUserAgent) ||
    (isProduction && allowFallback && isUpstashUserAgent)
  ) {
    console.log('🔓 Authentication successful for cleanup-expired-reservations');
  } else {
    console.error('❌ Unauthorized access attempt to cleanup-expired-reservations');
    console.error('Authentication details:', {
      verifiedQStash,
      isValidApiKey,
      isValidCronSecret,
      hasUpstashSignature,
      isUpstashUserAgent,
      isProduction,
      allowFallback,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[CRON] Starting slot reservations cleanup (expired + duplicates)...');

  try {
    const currentTime = new Date();

    // **Step 1: Clean up expired reservations**
    const deletedExpiredReservations = await db
      .delete(SlotReservationTable)
      .where(lt(SlotReservationTable.expiresAt, currentTime))
      .returning();

    console.log(
      `[CRON] Cleaned up ${deletedExpiredReservations.length} expired slot reservations:`,
      {
        count: deletedExpiredReservations.length,
        currentTime: currentTime.toISOString(),
        deletedReservations: deletedExpiredReservations.map((r) => ({
          id: r.id,
          guestEmail: r.guestEmail,
          startTime: r.startTime.toISOString(),
          expiresAt: r.expiresAt.toISOString(),
          expired: (currentTime.getTime() - r.expiresAt.getTime()) / (1000 * 60), // minutes ago
        })),
      },
    );

    // **Step 2: Clean up duplicate reservations (safety net)**
    console.log('[CRON] Checking for duplicate reservations...');

    const duplicatesQuery = sql`
      SELECT 
        event_id,
        start_time,
        guest_email,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(id ORDER BY created_at DESC) as reservation_ids
      FROM slot_reservations 
      GROUP BY event_id, start_time, guest_email 
      HAVING COUNT(*) > 1
    `;

    const duplicates = await db.execute(duplicatesQuery);

    let totalDuplicatesDeleted = 0;
    const duplicateCleanupResults = [];

    if (duplicates.rows.length > 0) {
      console.log(
        `[CRON] Found ${duplicates.rows.length} groups of duplicate reservations, cleaning up...`,
      );

      for (const duplicate of duplicates.rows) {
        const reservationIds = duplicate.reservation_ids as string[];
        const [keepId, ...deleteIds] = reservationIds; // Keep the most recent

        if (deleteIds.length > 0) {
          const deleteQuery = sql`
            DELETE FROM slot_reservations 
            WHERE id = ANY(${deleteIds})
          `;

          await db.execute(deleteQuery);
          totalDuplicatesDeleted += deleteIds.length;

          duplicateCleanupResults.push({
            eventId: duplicate.event_id,
            startTime: duplicate.start_time,
            guestEmail: duplicate.guest_email,
            originalCount: duplicate.duplicate_count,
            kept: keepId,
            deleted: deleteIds,
          });

          console.log(
            `[CRON] Cleaned up ${deleteIds.length} duplicates for slot (kept: ${keepId})`,
          );
        }
      }
    } else {
      console.log('[CRON] No duplicate reservations found');
    }

    const totalCleaned = deletedExpiredReservations.length + totalDuplicatesDeleted;

    console.log(`[CRON] Cleanup completed successfully:`, {
      expiredDeleted: deletedExpiredReservations.length,
      duplicatesDeleted: totalDuplicatesDeleted,
      totalCleaned: totalCleaned,
      timestamp: currentTime.toISOString(),
    });

    // Send success heartbeat to BetterStack
    await sendHeartbeatSuccess({
      url: ENV_CONFIG.BETTERSTACK_CLEANUP_RESERVATIONS_HEARTBEAT,
      jobName: 'Cleanup Expired Reservations',
    });

    return NextResponse.json({
      success: true,
      expiredCleaned: deletedExpiredReservations.length,
      duplicatesCleaned: totalDuplicatesDeleted,
      totalCleaned: totalCleaned,
      duplicateGroups: duplicates.rows.length,
      duplicateDetails: duplicateCleanupResults,
      timestamp: currentTime.toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Error during slot reservations cleanup:', error);

    // Send failure heartbeat to BetterStack
    await sendHeartbeatFailure(
      {
        url: ENV_CONFIG.BETTERSTACK_CLEANUP_RESERVATIONS_HEARTBEAT,
        jobName: 'Cleanup Expired Reservations',
      },
      error,
    );

    return NextResponse.json(
      { error: 'Failed to cleanup reservations', details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * Support for POST requests from QStash
 * This allows the endpoint to be called via QStash's HTTP POST mechanism
 */
export async function POST(request: NextRequest) {
  // Call the GET handler to process the cleanup
  return GET(request);
}
