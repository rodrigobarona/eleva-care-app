import { db } from '@/drizzle/db';
import { EventsTable, MeetingsTable } from '@/drizzle/schema';
import { isExpert } from '@/lib/auth/roles.server';
import { resolveGuestInfoBatch } from '@/lib/integrations/workos/guest-resolver';
import { generateCustomerId } from '@/lib/utils/customerUtils';
import * as Sentry from '@sentry/nextjs';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { desc, eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

const { logger } = Sentry;

/**
 * GET handler for the /api/customers endpoint
 * Returns a list of customers for the logged-in expert
 */
export async function GET() {
  try {
    const { user } = await withAuth();
  const userId = user?.id;

    if (!user || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify expert role
    const userIsExpert = await isExpert();
    if (!userIsExpert) {
      return NextResponse.json({ error: 'Forbidden: Expert role required' }, { status: 403 });
    }

    // Find all unique customers who have booked appointments with this expert (group by WorkOS user ID)
    const customersWithAppointmentsQuery = db
      .select({
        guestWorkosUserId: MeetingsTable.guestWorkosUserId,
        email: sql<string>`max(${MeetingsTable.guestEmail})`.as('email'),
        name: sql<string>`max(${MeetingsTable.guestName})`.as('name'),
        appointmentsCount: sql<number>`count(${MeetingsTable.id})`.as('appointment_count'),
        totalSpend: sql<number>`sum(${EventsTable.price})`.as('total_spend'),
        lastAppointment: sql<string>`max(${MeetingsTable.startTime})`.as('last_appointment'),
        firstAppointment: sql<string>`min(${MeetingsTable.startTime})`.as('first_appointment'),
      })
      .from(MeetingsTable)
      .innerJoin(EventsTable, eq(EventsTable.id, MeetingsTable.eventId))
      .where(eq(EventsTable.workosUserId, userId))
      .groupBy(MeetingsTable.guestWorkosUserId)
      .orderBy(desc(sql`last_appointment`));

    const customersWithAppointments = await customersWithAppointmentsQuery;

    // Resolve guest info from WorkOS for display
    const guestIds = customersWithAppointments.map((c) => c.guestWorkosUserId).filter(Boolean);
    const guestInfoMap = await resolveGuestInfoBatch(guestIds);

    // Format the response with secure customer IDs
    const customers = customersWithAppointments.map((customer) => {
      const guestInfo = guestInfoMap.get(customer.guestWorkosUserId);
      const email = guestInfo?.email ?? customer.email ?? '';
      const name = guestInfo?.fullName ?? customer.name ?? '';

      const customerId = generateCustomerId(userId, email);

      return {
        id: customerId,
        email,
        name,
        appointmentsCount: customer.appointmentsCount,
        totalSpend: customer.totalSpend || 0,
        lastAppointment: customer.lastAppointment,
        firstAppointment: customer.firstAppointment,
        stripeCustomerId: null,
      };
    });

    return NextResponse.json({ customers });
  } catch (error) {
    Sentry.captureException(error);
    logger.error('Error fetching customers', { error });
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
