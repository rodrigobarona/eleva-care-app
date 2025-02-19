import { NextResponse } from 'next/server';

import { db } from '@/drizzle/db';
import { MeetingTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

// Add route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all meetings for the expert
    const appointments = await db.query.MeetingTable.findMany({
      where: eq(MeetingTable.clerkUserId, userId),
      orderBy: (meetings, { desc }) => [desc(meetings.startTime)],
    });

    return NextResponse.json({
      appointments: appointments.map((appointment) => ({
        id: appointment.id,
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
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}
