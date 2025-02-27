import { db } from '@/drizzle/db';
import { MeetingTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CustomerDetails {
  id: string;
  name: string;
  email: string;
  stripeCustomerId: string;
  createdAt: string;
  totalSpend: number;
  appointmentsCount: number;
}

interface Appointment {
  id: string;
  eventName: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  amount: number;
}

interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  status: string;
  description: string;
  paymentMethodLast4?: string;
}

// Define Meeting type with properties needed in this file
type Meeting = typeof MeetingTable.$inferSelect & {
  event?: {
    name: string;
    id: string;
  } | null;
  price?: number;
  stripeCustomerId?: string;
  stripePaymentIntentId?: string;
  stripePaymentStatus?: string;
};

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    // Extract params from the promise
    const params = await props.params;

    // Log request method for debugging purposes
    console.log(`${request.method} request received for customer ID: ${params.id}`);

    // Get the authenticated user ID
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the customer email from the URL parameter and decode it
    const customerEmail = decodeURIComponent(params.id).toLowerCase();

    if (!customerEmail) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
    }

    // Get all meetings for this expert with this customer's email
    const meetings = (await db.query.MeetingTable.findMany({
      where: and(eq(MeetingTable.clerkUserId, userId), eq(MeetingTable.guestEmail, customerEmail)),
      with: {
        event: true,
      },
      orderBy: (fields, { desc }) => [desc(fields.startTime)],
    })) as Meeting[];

    if (meetings.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get the first meeting for customer details
    const firstMeeting = meetings[meetings.length - 1]; // Oldest meeting
    const lastMeeting = meetings[0]; // Most recent meeting

    // Calculate total spend
    const totalSpend = meetings.reduce((sum, meeting) => {
      return sum + (meeting.price || 0);
    }, 0);

    // Prepare customer details
    const customerDetails: CustomerDetails = {
      id: customerEmail,
      name: lastMeeting.guestName,
      email: customerEmail,
      stripeCustomerId: lastMeeting.stripeCustomerId || '',
      createdAt: firstMeeting.createdAt.toISOString(),
      totalSpend,
      appointmentsCount: meetings.length,
    };

    // Prepare appointments
    const appointments: Appointment[] = meetings.map((meeting) => {
      // Determine appointment status
      let status = 'pending';
      const now = new Date();
      const startTime = new Date(meeting.startTime);
      const endTime = new Date(meeting.endTime);

      if (endTime < now) {
        status = 'completed';
      } else if (startTime > now) {
        status = 'upcoming';
      } else {
        status = 'in-progress';
      }

      // Determine payment status based on Stripe payment status
      const paymentStatus = meeting.stripePaymentStatus || 'unknown';

      return {
        id: meeting.id,
        eventName: meeting.event?.name || 'Unknown Event',
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
        status,
        paymentStatus,
        amount: meeting.price || 0,
      };
    });

    // If customer has a Stripe customer ID, get payment history from Stripe
    // (This is a placeholder - in a real app, you would fetch actual payment data)
    let paymentHistory: PaymentHistory[] = [];

    if (lastMeeting.stripeCustomerId) {
      try {
        // This is just an example of how you might get payment data from Stripe
        // In a real application, you'd need to use the appropriate Stripe API calls

        // For demonstration, we'll create synthetic payment history based on meetings
        paymentHistory = meetings
          .filter((meeting) => meeting.stripePaymentStatus === 'succeeded')
          .map((meeting) => ({
            id: meeting.stripePaymentIntentId || `payment_${meeting.id}`,
            date: meeting.createdAt.toISOString(),
            amount: meeting.price || 0,
            status: 'succeeded',
            description: `Payment for ${meeting.event?.name || 'appointment'}`,
            paymentMethodLast4: '4242', // Example data
          }));
      } catch (error) {
        console.error('Error fetching Stripe payment history:', error);
        // Continue without payment history if there's an error
      }
    }

    return NextResponse.json({
      customer: customerDetails,
      appointments,
      paymentHistory,
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
