import { db } from '@/drizzle/db';
import { EventTable, MeetingTable } from '@/drizzle/schema';
import { isExpert } from '@/lib/auth/roles.server';
import { auth } from '@clerk/nextjs/server';
import { desc, eq, sql } from 'drizzle-orm';
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
        email: MeetingTable.guestEmail,
        name: MeetingTable.guestName,
        // Count appointments per customer
        appointmentsCount: sql<number>`count(${MeetingTable.id})`.as('appointment_count'),
        // Calculate total spend
        totalSpend: sql<number>`sum(${EventTable.price})`.as('total_spend'),
        // Get most recent appointment date
        lastAppointment: sql<string>`max(${MeetingTable.startTime})`.as('last_appointment'),
      })
      .from(MeetingTable)
      .innerJoin(EventTable, eq(EventTable.id, MeetingTable.eventId))
      .where(eq(EventTable.clerkUserId, userId))
      .groupBy(MeetingTable.guestEmail, MeetingTable.guestName)
      .orderBy(desc(sql`last_appointment`));

    const customersWithAppointments = await customersWithAppointmentsQuery;

    // Get Stripe customer IDs where available
    // Since we don't have direct PaymentIntentTable, we'll just use the customer data without Stripe IDs for now
    // In a real-world scenario, you would have a proper payment intents table to join here

    // Format the response
    const customers = customersWithAppointments.map((customer) => ({
      id: customer.email, // Using email as ID since it's unique per customer
      email: customer.email,
      name: customer.name,
      appointmentsCount: customer.appointmentsCount,
      totalSpend: customer.totalSpend || 0,
      lastAppointment: customer.lastAppointment,
      stripeCustomerId: null, // We don't have a way to get this without PaymentIntentTable
    }));

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
