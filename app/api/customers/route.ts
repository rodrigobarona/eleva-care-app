import { db } from '@/drizzle/db';
import { MeetingTable, UserTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CustomerWithStats {
  id: string;
  name: string;
  email: string;
  appointmentsCount: number;
  totalSpend: number;
  lastAppointment: Date | null;
  stripeCustomerId: string;
}

type Meeting = typeof MeetingTable.$inferSelect & {
  event?: {
    name: string;
    id: string;
  } | null;
  price?: number;
  stripeCustomerId?: string;
};

export async function GET() {
  try {
    // Get the authenticated user ID
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user from the database
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all meetings for this expert
    const meetings = await db.query.MeetingTable.findMany({
      where: eq(MeetingTable.clerkUserId, userId),
      with: {
        event: true,
      },
    });

    // Create a map of customer emails to their meetings
    const customerMeetingsMap = new Map<string, Meeting[]>();

    // Use for...of instead of forEach
    for (const meeting of meetings) {
      const email = meeting.guestEmail.toLowerCase();
      if (!customerMeetingsMap.has(email)) {
        customerMeetingsMap.set(email, []);
      }
      customerMeetingsMap.get(email)?.push(meeting);
    }

    // Get unique customer emails
    const customerEmails = Array.from(customerMeetingsMap.keys());

    // Prepare customer data with statistics
    const customers: CustomerWithStats[] = customerEmails.map((email) => {
      const customerMeetings = customerMeetingsMap.get(email) || [];
      const lastMeeting = customerMeetings.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      )[0];

      // Calculate total spend
      const totalSpend = customerMeetings.reduce((sum, meeting) => {
        return sum + (meeting.price || 0);
      }, 0);

      // Find customer name
      const customerName = lastMeeting?.guestName || 'Unknown Customer';

      return {
        id: email, // Using email as ID since guests may not have user accounts
        name: customerName,
        email: email,
        appointmentsCount: customerMeetings.length,
        totalSpend: totalSpend,
        lastAppointment: lastMeeting ? new Date(lastMeeting.startTime) : null,
        stripeCustomerId: lastMeeting?.stripeCustomerId || '',
      };
    });

    // Sort customers by appointment count (most active first)
    customers.sort((a, b) => b.appointmentsCount - a.appointmentsCount);

    return NextResponse.json({
      customers,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
