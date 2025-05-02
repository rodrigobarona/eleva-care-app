import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { formatDateTime } from '@/lib/formatters';
import { createClerkClient } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Stripe from 'stripe';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

// Updated PageProps type with proper next params - both params and searchParams as Promises
interface PageProps {
  params: Promise<{
    username: string;
    eventSlug: string;
    locale: string;
  }>;
  searchParams: Promise<{
    startTime: string;
    session_id?: string;
    timezone?: string;
  }>;
}

/**
 * Renders the booking success page for an event, handling meeting confirmation and payment validation.
 *
 * Depending on the booking and payment status, displays a confirmation card, a payment processing message, or redirects to the booking page with an appropriate error.
 *
 * @param props - Contains promises for route parameters and search parameters, including event and user identifiers, start time, session ID, and timezone.
 *
 * @returns A React element displaying booking or payment status, or triggers a redirect or 404 if the booking is invalid.
 *
 * @remark Returns a 404 page if the user, event, or start time is invalid. Redirects to the booking page with an error query if payment or meeting creation fails.
 */
export default async function SuccessPage(props: PageProps) {
  // Await both params and searchParams
  const params = await props.params;
  const searchParams = await props.searchParams;

  const { startTime, session_id, timezone } = searchParams;

  // Get the user's timezone either from the URL or use the cookie as fallback
  // This ensures we display the time in the user's local timezone
  const cookieStore = await cookies();
  const userTimezone = timezone || cookieStore.get('user-timezone')?.value || 'UTC';

  const { username, eventSlug, locale } = params;

  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const users = await clerk.users.getUserList({
    username: [username],
  });
  const user = users.data[0];
  if (!user) return notFound();

  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId: userIdCol, isActive, slug }, { eq, and }) =>
      and(eq(isActive, true), eq(userIdCol, user.id), eq(slug, eventSlug)),
  });

  if (event == null) notFound();

  const calendarUser = await clerk.users.getUser(user.id);

  // Validate startTime before creating Date object
  let startTimeDate: Date;
  try {
    if (!startTime) throw new Error('Missing startTime');
    startTimeDate = new Date(startTime);
    if (Number.isNaN(startTimeDate.getTime())) throw new Error('Invalid date');
  } catch (error) {
    console.error('Invalid startTime:', startTime, error);
    return notFound();
  }

  // Verify that the meeting was actually created
  const meeting = await db.query.MeetingTable.findFirst({
    where: ({ eventId, startTime: meetingStartTime, stripeSessionId }, { eq, and, or }) =>
      and(
        eq(eventId, event.id),
        eq(meetingStartTime, startTimeDate),
        session_id ? or(eq(stripeSessionId, session_id)) : undefined,
      ),
  });

  // If meeting exists, show success page
  if (meeting) {
    // We prioritize the meeting's stored timezone if available
    const displayTimezone = meeting.timezone || userTimezone;

    return (
      <div className="mx-auto mt-10 flex max-w-5xl flex-col items-center justify-center p-4 md:mt-0 md:h-dvh md:p-6">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>
              Successfully Booked {event.name} with {calendarUser.fullName}
            </CardTitle>
            <CardDescription>
              {formatDateTime(startTimeDate, displayTimezone)}
              <span className="ml-1 text-xs text-muted-foreground">
                ({displayTimezone.replace(/_/g, ' ')})
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>You should receive an email confirmation shortly.</p>
            <p className="mt-2 text-muted-foreground">Meeting ID: {meeting.id}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If paid event but no meeting found, check the session status
  if (event.price > 0 && session_id) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
    });

    try {
      console.log('Checking session status:', {
        sessionId: session_id,
        startTime,
        eventSlug,
      });

      const session = await stripe.checkout.sessions.retrieve(session_id);

      console.log('Session status:', {
        sessionId: session_id,
        paymentStatus: session.payment_status,
        customerId: session.customer,
        paymentIntent: session.payment_intent,
      });

      if (session.payment_status === 'paid') {
        return (
          <div className="mx-auto mt-10 flex max-w-5xl flex-col items-center justify-center p-4 md:mt-0 md:h-dvh md:p-6">
            <Card className="mx-auto max-w-xl">
              <CardHeader>
                <CardTitle>Payment Confirmed</CardTitle>
                <CardDescription>
                  Your payment has been confirmed and your meeting is being created.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>Please wait a moment while we finalize your booking...</p>
                <p className="mt-4 text-sm text-muted-foreground">
                  If this page doesn&apos;t update automatically, please refresh in a few seconds.
                </p>
                <meta httpEquiv="refresh" content="5" />
              </CardContent>
            </Card>
          </div>
        );
      }

      if (session.payment_status === 'unpaid') {
        return (
          <div className="mx-auto mt-10 flex max-w-5xl flex-col items-center justify-center p-4 md:mt-0 md:h-dvh md:p-6">
            <Card className="mx-auto max-w-xl">
              <CardHeader>
                <CardTitle>Payment Processing</CardTitle>
                <CardDescription>Your payment is still being processed.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Please wait while we confirm your payment...</p>
                <p className="mt-4 text-sm text-muted-foreground">
                  This page will automatically refresh when the payment is confirmed.
                </p>
                <meta httpEquiv="refresh" content="5" />
              </CardContent>
            </Card>
          </div>
        );
      }

      // If payment failed or other status
      console.error('Unexpected payment status:', session.payment_status);
      redirect(`/${locale}/${username}/${eventSlug}/book?error=payment-failed`);
    } catch (error) {
      console.error('Error retrieving session:', error);
      redirect(`/${locale}/${username}/${eventSlug}/book?error=payment-error`);
    }
  }

  // If paid event but no meeting and no valid session, redirect to booking page
  if (event.price > 0) {
    redirect(`/${locale}/${username}/${eventSlug}/book?error=payment-incomplete`);
  }

  // If free event but no meeting, something went wrong
  redirect(`/${locale}/${username}/${eventSlug}/book?error=meeting-not-created`);
}
