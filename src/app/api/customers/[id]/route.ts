import { db } from '@/drizzle/db';
import { EventsTable, MeetingsTable } from '@/drizzle/schema';
import { isExpert } from '@/lib/auth/roles.server';
import { resolveGuestInfoBatch } from '@/lib/integrations/workos/guest-resolver';
import { generateCustomerId } from '@/lib/utils/customerUtils';
import { withAuth } from '@workos-inc/authkit-nextjs';
import * as Sentry from '@sentry/nextjs';
import { and, desc, eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const { logger } = Sentry;

/**
 * GET handler for individual customer details by secure ID
 */
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { user } = await withAuth();
    const userId = user?.id;
    const customerId = params.id;

    if (!user || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify expert role
    const userIsExpert = await isExpert();
    if (!userIsExpert) {
      return NextResponse.json({ error: 'Forbidden: Expert role required' }, { status: 403 });
    }

    // Get all meetings for this expert with guest identifiers
    const meetingsWithGuests = await db
      .select({
        guestWorkosUserId: MeetingsTable.guestWorkosUserId,
        guestEmail: MeetingsTable.guestEmail,
        guestName: MeetingsTable.guestName,
      })
      .from(MeetingsTable)
      .innerJoin(EventsTable, eq(EventsTable.id, MeetingsTable.eventId))
      .where(eq(EventsTable.workosUserId, userId));

    // Deduplicate by guestWorkosUserId (canonical identifier)
    const uniqueGuests = new Map<
      string,
      { guestEmail: string; guestName: string }
    >();
    for (const m of meetingsWithGuests) {
      if (!uniqueGuests.has(m.guestWorkosUserId)) {
        uniqueGuests.set(m.guestWorkosUserId, {
          guestEmail: m.guestEmail,
          guestName: m.guestName,
        });
      }
    }

    // Batch-resolve guest info from WorkOS (fall back to DB columns if resolution fails)
    const guestIds = [...uniqueGuests.keys()];
    const guestInfoMap = await resolveGuestInfoBatch(guestIds);

    // Build customer list: (guestWorkosUserId, email, name) - email/name from WorkOS or DB
    const customers: { guestWorkosUserId: string; email: string; name: string }[] = [];
    for (const [workosUserId, dbFallback] of uniqueGuests) {
      const guestInfo = guestInfoMap.get(workosUserId);
      const email = guestInfo?.email || dbFallback.guestEmail;
      const name = guestInfo?.fullName || dbFallback.guestName || 'Guest';
      customers.push({ guestWorkosUserId: workosUserId, email, name });
    }

    // Find the customer that matches the provided customerId
    const matchedCustomer = customers.find(
      (c) => generateCustomerId(userId, c.email) === customerId,
    );

    if (!matchedCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { guestWorkosUserId, email: customerEmail, name: customerName } = matchedCustomer;

    // Get all appointments for this customer (filter by guestWorkosUserId - canonical)
    const appointments = await db
      .select({
        id: MeetingsTable.id,
        guestName: MeetingsTable.guestName,
        guestEmail: MeetingsTable.guestEmail,
        startTime: MeetingsTable.startTime,
        endTime: MeetingsTable.endTime,
        timezone: MeetingsTable.timezone,
        guestNotes: MeetingsTable.guestNotes,
        meetingUrl: MeetingsTable.meetingUrl,
        stripePaymentStatus: MeetingsTable.stripePaymentStatus,
        stripePaymentIntentId: MeetingsTable.stripePaymentIntentId,
        stripeTransferStatus: MeetingsTable.stripeTransferStatus,
        eventName: EventsTable.name,
        amount: EventsTable.price,
      })
      .from(MeetingsTable)
      .innerJoin(EventsTable, eq(EventsTable.id, MeetingsTable.eventId))
      .where(
        and(
          eq(EventsTable.workosUserId, userId),
          eq(MeetingsTable.guestWorkosUserId, guestWorkosUserId),
        ),
      )
      .orderBy(desc(MeetingsTable.startTime));

    if (appointments.length === 0) {
      return NextResponse.json({ error: 'Customer has no appointments' }, { status: 404 });
    }

    // Calculate total spend
    const totalSpend = appointments.reduce(
      (sum, appointment) => sum + (appointment.amount || 0),
      0,
    );

    // Create customer object with secure ID (use resolved name from WorkOS)
    const customer = {
      id: customerId, // Use the provided secure ID
      email: customerEmail,
      name: customerName,
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
    Sentry.captureException(error);
    logger.error('Error fetching customer details', { error });
    return NextResponse.json({ error: 'Failed to fetch customer details' }, { status: 500 });
  }
}
