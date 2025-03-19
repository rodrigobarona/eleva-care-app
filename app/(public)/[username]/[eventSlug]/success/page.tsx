import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { formatDateTime } from '@/lib/formatters';
import { createClerkClient } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import Stripe from 'stripe';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function SuccessPage(props: {
  params: Promise<{ username: string; eventSlug: string }>;
  searchParams: Promise<{ startTime: string; session_id?: string }>;
}) {
  const searchParams = await props.searchParams;

  const { startTime, session_id } = searchParams;

  const params = await props.params;

  const { username, eventSlug } = params;

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
    return (
      <div className="mx-auto mt-10 flex max-w-5xl flex-col items-center justify-center p-4 md:mt-0 md:h-dvh md:p-6">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>
              Successfully Booked {event.name} with {calendarUser.fullName}
            </CardTitle>
            <CardDescription>{formatDateTime(startTimeDate)}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>You should receive an email confirmation shortly.</p>
            <p className="text-muted-foreground mt-2">Meeting ID: {meeting.id}</p>
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
                <p className="text-muted-foreground mt-4 text-sm">
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
                <p className="text-muted-foreground mt-4 text-sm">
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
      redirect(`/${username}/${eventSlug}/book?error=payment-failed`);
    } catch (error) {
      console.error('Error retrieving session:', error);
      redirect(`/${username}/${eventSlug}/book?error=payment-error`);
    }
  }

  // If paid event but no meeting and no valid session, redirect to booking page
  if (event.price > 0) {
    redirect(`/${username}/${eventSlug}/book?error=payment-incomplete`);
  }

  // If free event but no meeting, something went wrong
  redirect(`/${username}/${eventSlug}/book?error=meeting-not-created`);
}
