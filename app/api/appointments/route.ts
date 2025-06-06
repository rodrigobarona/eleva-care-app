import { db } from '@/drizzle/db';
import { MeetingTable, SlotReservationTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { and, eq, gt } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Add route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all confirmed meetings for the expert
    const appointments = await db.query.MeetingTable.findMany({
      where: eq(MeetingTable.clerkUserId, userId),
      orderBy: (meetings, { desc }) => [desc(meetings.startTime)],
    });

    // Fetch active slot reservations for the expert
    const currentTime = new Date();
    const reservations = await db.query.SlotReservationTable.findMany({
      where: and(
        eq(SlotReservationTable.clerkUserId, userId),
        gt(SlotReservationTable.expiresAt, currentTime),
      ),
      orderBy: (reservations, { desc }) => [desc(reservations.startTime)],
    });

    console.log(
      `[Appointments API] Found ${appointments.length} appointments and ${reservations.length} active reservations for expert ${userId}`,
    );

    return NextResponse.json({
      appointments: appointments.map((appointment) => ({
        id: appointment.id,
        type: 'appointment' as const,
        guestName: appointment.guestName,
        guestEmail: appointment.guestEmail,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        timezone: appointment.timezone,
        meetingUrl: appointment.meetingUrl,
        guestNotes: appointment.guestNotes,
        stripePaymentStatus: appointment.stripePaymentStatus,
        stripeTransferStatus: appointment.stripeTransferStatus,
      })),
      reservations: reservations.map((reservation) => ({
        id: reservation.id,
        type: 'reservation' as const,
        guestName: reservation.guestEmail,
        guestEmail: reservation.guestEmail,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        timezone: 'UTC',
        expiresAt: reservation.expiresAt,
        stripeSessionId: reservation.stripeSessionId,
        stripePaymentIntentId: reservation.stripePaymentIntentId,
        eventId: reservation.eventId,
      })),
    });
  } catch (error) {
    console.error('Error fetching appointments and reservations:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}
