import { db } from '@/drizzle/db';
import { EventTable, MeetingTable } from '@/drizzle/schema';
import { isExpert } from '@/lib/auth/roles.server';
import { findEmailByCustomerId } from '@/lib/utils/customerUtils';
import { auth } from '@clerk/nextjs/server';
import { and, desc, eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * GET handler for individual customer details by secure ID
 */
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { userId } = await auth();
    const customerId = params.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify expert role
    const userIsExpert = await isExpert();
    if (!userIsExpert) {
      return NextResponse.json({ error: 'Forbidden: Expert role required' }, { status: 403 });
    }

    // First, get all customers for this expert to find the matching ID
    const allCustomersQuery = db
      .select({
        email: MeetingTable.guestEmail,
        name: MeetingTable.guestName,
      })
      .from(MeetingTable)
      .innerJoin(EventTable, eq(EventTable.id, MeetingTable.eventId))
      .where(eq(EventTable.clerkUserId, userId))
      .groupBy(MeetingTable.guestEmail, MeetingTable.guestName);

    const allCustomers = await allCustomersQuery;

    // Find the customer email that matches the provided ID using the shared utility
    const customerEmails = allCustomers.map((customer) => customer.email);
    const customerEmail = findEmailByCustomerId(userId, customerId, customerEmails);

    if (!customerEmail) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Now get all appointments for this customer
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
      return NextResponse.json({ error: 'Customer has no appointments' }, { status: 404 });
    }

    // Calculate total spend
    const totalSpend = appointments.reduce(
      (sum, appointment) => sum + (appointment.amount || 0),
      0,
    );

    // Create customer object with secure ID
    const customer = {
      id: customerId, // Use the provided secure ID
      email: customerEmail,
      name: appointments[0].guestName || '',
      stripeCustomerId: appointments[0]?.stripePaymentIntentId
        ? `cus_${appointments[0].stripePaymentIntentId.substring(3, 11)}`
        : null,
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
