import { db } from '@/drizzle/db';
import { SlotReservationTable } from '@/drizzle/schema';
import { lt } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cleanup Expired Reservations - Removes expired slot reservations from the database
// Performs the following tasks:
// - Identifies slot reservations that have passed their expiration time
// - Removes expired reservations from the database
// - Logs detailed information about deleted reservations
// - Provides cleanup statistics for monitoring

export async function GET(request: NextRequest) {
  // Verify the request is coming from Vercel Cron or QStash
  const authHeader = request.headers.get('authorization');
  const isQStashRequest =
    request.headers.get('x-qstash-request') === 'true' ||
    request.headers.has('upstash-signature') ||
    request.headers.has('Upstash-Signature') ||
    request.headers.has('x-internal-qstash-verification');

  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isQStashRequest && !isVercelCron) {
    console.warn('[CRON] Unauthorized access to cleanup-expired-reservations endpoint');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[CRON] Starting expired slot reservations cleanup...');

  try {
    const currentTime = new Date();

    // Delete all reservations that have expired
    const deletedReservations = await db
      .delete(SlotReservationTable)
      .where(lt(SlotReservationTable.expiresAt, currentTime))
      .returning();

    console.log(`[CRON] Cleaned up ${deletedReservations.length} expired slot reservations:`, {
      count: deletedReservations.length,
      currentTime: currentTime.toISOString(),
      deletedReservations: deletedReservations.map((r) => ({
        id: r.id,
        guestEmail: r.guestEmail,
        startTime: r.startTime.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
        expired: (currentTime.getTime() - r.expiresAt.getTime()) / (1000 * 60), // minutes ago
      })),
    });

    return NextResponse.json({
      success: true,
      cleanedUp: deletedReservations.length,
      timestamp: currentTime.toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Error cleaning up expired slot reservations:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup expired reservations', details: String(error) },
      { status: 500 },
    );
  }
}
