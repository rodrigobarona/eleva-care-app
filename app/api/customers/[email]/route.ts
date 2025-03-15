import { db } from '@/drizzle/db';
import { EventTable, MeetingTable } from '@/drizzle/schema';
import { isExpert } from '@/lib/auth/roles.server';
import { auth } from '@clerk/nextjs/server';
import { and, desc, eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Use the format that matches other API routes in the codebase
export async function GET(request: NextRequest, props: { params: Promise<{ email: string }> }) {
  try {
    // Extract params from the promise
    const params = await props.params;
    const { userId } = await auth();
    const customerEmail = decodeURIComponent(params.email);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify expert role
    const userIsExpert = await isExpert();
    if (!userIsExpert) {
      return NextResponse.json({ error: 'Forbidden: Expert role required' }, { status: 403 });
    }

    // Get customer appointments
    const appointments = await db
      .select({
        id: MeetingTable.id,
        guestName: MeetingTable.guestName,
        guestEmail: MeetingTable.guestEmail,
        startTime: MeetingTable.startTime,
        endTime: MeetingTable.endTime,
        timezone: MeetingTable.timezone,
        guestNotes: MeetingTable.guestNotes,
        meetingUrl: MeetingTable.meetingUrl,
        stripePaymentStatus: MeetingTable.stripePaymentStatus,
        stripePaymentIntentId: MeetingTable.stripePaymentIntentId,
        stripeTransferStatus: MeetingTable.stripeTransferStatus,
        eventName: EventTable.name,
        amount: EventTable.price,
      })
      .from(MeetingTable)
      .innerJoin(EventTable, eq(EventTable.id, MeetingTable.eventId))
      .where(and(eq(EventTable.clerkUserId, userId), eq(MeetingTable.guestEmail, customerEmail)))
      .orderBy(desc(MeetingTable.startTime));

    if (appointments.length === 0) {
      return NextResponse.json({ error: 'Customer doesn&apos;t exist' }, { status: 404 });
    }

    // Calculate total spend
    const totalSpend = appointments.reduce(
      (sum, appointment) => sum + (appointment.amount || 0),
      0,
    );

    // Create customer object
    const customer = {
      id: customerEmail,
      email: customerEmail,
      name: appointments[0].guestName || '',
      stripeCustomerId: appointments[0]?.stripePaymentIntentId
        ? `cus_${appointments[0].stripePaymentIntentId.substring(3, 11)}`
        : null, // Generate a fake customer ID for demo
      totalSpend,
      appointmentsCount: appointments.length,
      lastAppointment: appointments[0]?.startTime || null,
      appointments,
      notes: '', // This could be fetched from a separate notes table if you have one
      createdAt: appointments[appointments.length - 1]?.startTime || new Date().toISOString(),
    };

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    return NextResponse.json({ error: 'Failed to fetch customer details' }, { status: 500 });
  }
}
