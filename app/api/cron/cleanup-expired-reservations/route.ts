import { db } from '@/drizzle/db';
import { SlotReservationTable } from '@/drizzle/schema';
import { isVerifiedQStashRequest } from '@/lib/qstash-utils';
import { lt } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';
export const maxDuration = 60;

// Cleanup Expired Reservations - Removes expired slot reservations from the database
// Performs the following tasks:
// - Identifies slot reservations that have passed their expiration time
// - Removes expired reservations from the database
// - Logs detailed information about deleted reservations
// - Provides cleanup statistics for monitoring

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

/**
 * Support for POST requests from QStash
 * This allows the endpoint to be called via QStash's HTTP POST mechanism
 */
export async function POST(request: NextRequest) {
  // Call the GET handler to process the cleanup
  return GET(request);
}
