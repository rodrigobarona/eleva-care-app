import { db } from '@/drizzle/db';
import { AppointmentTable, EventTable, PaymentIntentTable, UserTable } from '@/drizzle/schema';
import { isExpert } from '@/lib/auth/roles.server';
import { auth } from '@clerk/nextjs/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * GET handler for the /api/customers endpoint
 * Returns a list of customers for the logged-in expert
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify expert role
    const userIsExpert = await isExpert();
    if (!userIsExpert) {
      return NextResponse.json({ error: 'Forbidden: Expert role required' }, { status: 403 });
    }

    // Find all unique customers who have booked appointments with this expert
    const customersWithAppointmentsQuery = db
      .select({
        email: AppointmentTable.guestEmail,
        name: AppointmentTable.guestName,
        // Count appointments per customer
        appointmentsCount: sql<number>`count(${AppointmentTable.id})`.as('appointment_count'),
        // Calculate total spend
        totalSpend: sql<number>`sum(${EventTable.price})`.as('total_spend'),
        // Get most recent appointment date
        lastAppointment: sql<string>`max(${AppointmentTable.startTime})`.as('last_appointment'),
      })
      .from(AppointmentTable)
      .innerJoin(EventTable, eq(EventTable.id, AppointmentTable.eventId))
      .where(eq(EventTable.clerkUserId, userId))
      .groupBy(AppointmentTable.guestEmail, AppointmentTable.guestName)
      .orderBy(desc(sql`last_appointment`));

    const customersWithAppointments = await customersWithAppointmentsQuery;

    // Get Stripe customer IDs where available (this would come from your payment integration)
    // This is a simplified example - in a real app, you'd link customers to their Stripe IDs
    const stripeInfo = await db
      .select({
        email: AppointmentTable.guestEmail,
        stripeCustomerId: PaymentIntentTable.stripeCustomerId,
      })
      .from(AppointmentTable)
      .innerJoin(PaymentIntentTable, eq(PaymentIntentTable.appointmentId, AppointmentTable.id))
      .innerJoin(EventTable, eq(EventTable.id, AppointmentTable.eventId))
      .where(eq(EventTable.clerkUserId, userId))
      .groupBy(AppointmentTable.guestEmail, PaymentIntentTable.stripeCustomerId);

    // Create a map of email to Stripe customer ID
    const stripeCustomerIdMap = stripeInfo.reduce(
      (acc, { email, stripeCustomerId }) => {
        if (email && stripeCustomerId) {
          acc[email] = stripeCustomerId;
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    // Format the response
    const customers = customersWithAppointments.map((customer) => ({
      id: customer.email, // Using email as ID since it's unique per customer
      email: customer.email,
      name: customer.name,
      appointmentsCount: customer.appointmentsCount,
      totalSpend: customer.totalSpend || 0,
      lastAppointment: customer.lastAppointment,
      stripeCustomerId: stripeCustomerIdMap[customer.email] || null,
    }));

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
