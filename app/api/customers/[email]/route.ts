import { db } from '@/drizzle/db';
import { AppointmentTable, EventTable, PaymentIntentTable } from '@/drizzle/schema';
import { isExpert } from '@/lib/auth/roles.server';
import { auth } from '@clerk/nextjs/server';
import { and, desc, eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { email: string } }) {
  try {
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
        id: AppointmentTable.id,
        guestName: AppointmentTable.guestName,
        guestEmail: AppointmentTable.guestEmail,
        startTime: AppointmentTable.startTime,
        endTime: AppointmentTable.endTime,
        timezone: AppointmentTable.timezone,
        guestNotes: AppointmentTable.guestNotes,
        meetingUrl: AppointmentTable.meetingUrl,
        stripePaymentStatus: AppointmentTable.stripePaymentStatus,
        stripePaymentIntentId: PaymentIntentTable.stripePaymentIntentId,
        stripeTransferStatus: AppointmentTable.stripeTransferStatus,
        eventName: EventTable.name,
        amount: EventTable.price,
      })
      .from(AppointmentTable)
      .innerJoin(EventTable, eq(EventTable.id, AppointmentTable.eventId))
      .leftJoin(PaymentIntentTable, eq(PaymentIntentTable.appointmentId, AppointmentTable.id))
      .where(
        and(eq(EventTable.clerkUserId, userId), eq(AppointmentTable.guestEmail, customerEmail)),
      )
      .orderBy(desc(AppointmentTable.startTime));

    if (appointments.length === 0) {
      return NextResponse.json({ error: 'Customer doesn&apos;t exist' }, { status: 404 });
    }

    // Get Stripe customer ID if available
    const paymentInfo = await db
      .select({
        stripeCustomerId: PaymentIntentTable.stripeCustomerId,
        createdAt: PaymentIntentTable.created,
      })
      .from(PaymentIntentTable)
      .innerJoin(AppointmentTable, eq(AppointmentTable.id, PaymentIntentTable.appointmentId))
      .innerJoin(EventTable, eq(EventTable.id, AppointmentTable.eventId))
      .where(
        and(eq(EventTable.clerkUserId, userId), eq(AppointmentTable.guestEmail, customerEmail)),
      )
      .orderBy(desc(PaymentIntentTable.created))
      .limit(1);

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
      stripeCustomerId: paymentInfo[0]?.stripeCustomerId || null,
      totalSpend,
      appointmentsCount: appointments.length,
      lastAppointment: appointments[0]?.startTime || null,
      appointments,
      notes: '', // This could be fetched from a separate notes table if you have one
      createdAt: paymentInfo[0]?.createdAt || appointments[appointments.length - 1]?.startTime,
    };

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    return NextResponse.json({ error: 'Failed to fetch customer details' }, { status: 500 });
  }
}
