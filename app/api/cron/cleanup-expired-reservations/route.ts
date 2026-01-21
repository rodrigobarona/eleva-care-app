import { ENV_CONFIG } from '@/config/env';
import { db } from '@/drizzle/db';
import { EventTable, ScheduleTable, SlotReservationTable, UserTable } from '@/drizzle/schema';
import ReservationExpiredTemplate from '@/emails/payments/reservation-expired';
import {
  sendHeartbeatFailure,
  sendHeartbeatSuccess,
} from '@/lib/integrations/betterstack/heartbeat';
import { triggerWorkflow } from '@/lib/integrations/novu';
import { sendEmail } from '@/lib/integrations/novu/email';
import { isVerifiedQStashRequest } from '@/lib/integrations/qstash/utils';
import { render } from '@react-email/render';
import { format, toZonedTime } from 'date-fns-tz';
import { eq, lt, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import React from 'react';

// Add route segment config
export const preferredRegion = 'auto';
export const maxDuration = 60;

// Enhanced Cleanup for Slot Reservations - Removes expired and duplicate reservations
// Performs the following tasks:
// - Identifies slot reservations that have passed their expiration time
// - Removes expired reservations from the database
// - Detects and removes duplicate reservations (same event, time, guest)
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

  console.log('[CRON] Starting slot reservations cleanup (expired + duplicates)...');

  try {
    const currentTime = new Date();

    // **Step 1: Query expired reservations with full details for notifications**
    // Join with ScheduleTable to get the expert's actual timezone
    const expiredReservationsQuery = await db
      .select({
        reservation: SlotReservationTable,
        eventName: EventTable.name,
        eventDuration: EventTable.durationInMinutes,
        expertClerkId: EventTable.clerkUserId,
        expertFirstName: UserTable.firstName,
        expertLastName: UserTable.lastName,
        expertEmail: UserTable.email,
        // Get expert's timezone from their schedule settings
        expertTimezone: ScheduleTable.timezone,
      })
      .from(SlotReservationTable)
      .innerJoin(EventTable, eq(EventTable.id, SlotReservationTable.eventId))
      .innerJoin(UserTable, eq(UserTable.clerkUserId, SlotReservationTable.clerkUserId))
      .leftJoin(ScheduleTable, eq(ScheduleTable.clerkUserId, SlotReservationTable.clerkUserId))
      .where(lt(SlotReservationTable.expiresAt, currentTime));

    console.log(`[CRON] Found ${expiredReservationsQuery.length} expired reservations to process`);

    // **Step 2: Send notifications before deleting**
    let notificationsSent = 0;
    for (const expired of expiredReservationsQuery) {
      const {
        reservation,
        eventName,
        expertFirstName,
        expertLastName,
        expertClerkId,
        expertEmail,
        expertTimezone,
      } = expired;
      const expertName = [expertFirstName, expertLastName].filter(Boolean).join(' ') || 'Expert';

      // Use expert's actual timezone from their schedule settings
      // Fall back to UTC if not set (UTC is safe since Vercel runs in UTC)
      const timezone = expertTimezone || 'UTC';
      const zonedStartTime = toZonedTime(reservation.startTime, timezone);
      const appointmentDate = format(zonedStartTime, 'EEEE, MMMM d, yyyy', { timeZone: timezone });
      const appointmentTime = format(zonedStartTime, 'h:mm a', { timeZone: timezone });

      // Extract name from email (before @) or use 'Client'
      const guestName =
        reservation.guestEmail
          .split('@')[0]
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Client';

      // Determine locale from guest email domain using priority:
      // 1. Check for Portuguese domains (.pt, .com.br)
      // 2. Check for Spanish domains (.es)
      // 3. Default to English
      const guestEmailLower = reservation.guestEmail?.toLowerCase() || '';
      let locale: 'pt' | 'en' | 'es' = 'en';
      if (
        guestEmailLower.endsWith('.pt') ||
        guestEmailLower.endsWith('.com.br') ||
        guestEmailLower.endsWith('.br')
      ) {
        locale = 'pt';
      } else if (guestEmailLower.endsWith('.es')) {
        locale = 'es';
      }

      // Send notification to patient (via direct email with idempotency)
      try {
        const patientEmailHtml = await render(
          React.createElement(ReservationExpiredTemplate, {
            recipientName: guestName,
            recipientType: 'patient',
            expertName,
            serviceName: eventName,
            appointmentDate,
            appointmentTime,
            timezone,
            locale,
          }),
        );

        // Note: For true idempotency, consider adding a 'patientNotified' flag to the reservation
        // before deletion and checking it before sending. Current approach relies on the
        // reservation being deleted after successful processing.
        const emailResult = await sendEmail({
          to: reservation.guestEmail,
          subject:
            locale === 'pt'
              ? `A sua reserva expirou - ${eventName}`
              : locale === 'es'
                ? `Su reserva ha expirado - ${eventName}`
                : `Your booking reservation has expired - ${eventName}`,
          html: patientEmailHtml,
        });

        if (emailResult.success) {
          console.log(`✅ Expiration notification sent to patient: ${reservation.guestEmail}`);
          notificationsSent++;
        } else {
          console.error(
            `❌ Failed to send expiration notification to patient ${reservation.guestEmail}:`,
            emailResult.error,
          );
        }
      } catch (patientError) {
        console.error(
          `❌ Failed to send expiration notification to patient ${reservation.guestEmail}:`,
          patientError,
        );
      }

      // Send notification to expert (via Novu for in-app + email)
      try {
        await triggerWorkflow({
          workflowId: 'reservation-expired',
          to: {
            subscriberId: expertClerkId,
            email: expertEmail || undefined,
            firstName: expertFirstName || undefined,
            lastName: expertLastName || undefined,
          },
          payload: {
            expertName,
            clientName: guestName,
            serviceName: eventName,
            appointmentDate,
            appointmentTime,
            timezone,
            locale,
          },
          transactionId: `reservation-expired-${reservation.id}`, // Idempotency key
        });

        console.log(`✅ Expiration notification sent to expert: ${expertClerkId}`);
        notificationsSent++;
      } catch (expertError) {
        console.error(
          `❌ Failed to send expiration notification to expert ${expertClerkId}:`,
          expertError,
        );
      }
    }

    // **Step 3: Clean up expired reservations**
    const deletedExpiredReservations = await db
      .delete(SlotReservationTable)
      .where(lt(SlotReservationTable.expiresAt, currentTime))
      .returning();

    console.log(
      `[CRON] Cleaned up ${deletedExpiredReservations.length} expired slot reservations:`,
      {
        count: deletedExpiredReservations.length,
        notificationsSent,
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
      notificationsSent,
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
