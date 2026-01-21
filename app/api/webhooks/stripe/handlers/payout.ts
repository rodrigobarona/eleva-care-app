import { db } from '@/drizzle/db';
import { EventTable, MeetingTable, UserTable } from '@/drizzle/schema';
import { triggerWorkflow } from '@/lib/integrations/novu';
import { addDays, format } from 'date-fns';
import { and, desc, eq } from 'drizzle-orm';
import type { Stripe } from 'stripe';

/**
 * Handles Stripe Connect payout events for marketplace payments
 * Sends notification to expert with real appointment data
 */
export async function handlePayoutPaid(payout: Stripe.Payout) {
  console.log('Payout processed:', payout.id);

  try {
    // Extract the destination account ID - it should be a string for Connect accounts
    const destinationAccountId = typeof payout.destination === 'string' ? payout.destination : null;

    if (!destinationAccountId) {
      console.error('Invalid payout destination type:', typeof payout.destination);
      return;
    }

    // Find the user associated with this Connect account
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.stripeConnectAccountId, destinationAccountId),
    });

    if (!user) {
      console.error('User not found for Connect account:', destinationAccountId);
      return;
    }

    // Query the most recent successful meeting for this expert to get real appointment data
    // This links the payout to the actual client and service
    const recentMeeting = await db
      .select({
        id: MeetingTable.id,
        guestName: MeetingTable.guestName,
        guestEmail: MeetingTable.guestEmail,
        startTime: MeetingTable.startTime,
        endTime: MeetingTable.endTime,
        eventName: EventTable.name,
        stripeAmount: MeetingTable.stripeAmount,
      })
      .from(MeetingTable)
      .innerJoin(EventTable, eq(EventTable.id, MeetingTable.eventId))
      .where(
        and(
          eq(MeetingTable.clerkUserId, user.clerkUserId),
          eq(MeetingTable.stripePaymentStatus, 'succeeded'),
        ),
      )
      .orderBy(desc(MeetingTable.startTime))
      .limit(1);

    const meeting = recentMeeting[0];

    // Calculate expected arrival date based on payout arrival_date or estimate
    const arrivalDate = payout.arrival_date
      ? new Date(payout.arrival_date * 1000)
      : addDays(new Date(), 2); // Default 2 business days

    const expectedArrival = format(arrivalDate, 'EEEE, MMMM d, yyyy');
    const amount = (payout.amount / 100).toFixed(2); // Convert cents to euros

    // Use real meeting data if available, otherwise fall back to defaults
    const clientName = meeting?.guestName || 'Client';
    const serviceName = meeting?.eventName || 'Professional consultation';
    const appointmentDate = meeting?.startTime
      ? format(meeting.startTime, 'EEEE, MMMM d, yyyy')
      : format(new Date(), 'EEEE, MMMM d, yyyy');
    const appointmentTime = meeting?.startTime
      ? `${format(meeting.startTime, 'h:mm a')} - ${meeting.endTime ? format(meeting.endTime, 'h:mm a') : ''}`
      : format(new Date(), 'h:mm a');

    // Use actual bank account last4 from user profile if available
    const bankLastFour = user.stripeBankAccountLast4 || '••••';

    console.log('📧 Sending payout notification with real data:', {
      expertName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      clientName,
      serviceName,
      appointmentDate,
      amount,
      hasMeetingData: !!meeting,
    });

    // Trigger Novu workflow for payout notification
    try {
      await triggerWorkflow({
        workflowId: 'expert-payout-notification',
        to: {
          subscriberId: user.clerkUserId,
          email: user.email || 'no-email@eleva.care',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        },
        payload: {
          expertName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Expert',
          payoutAmount: amount,
          currency: payout.currency?.toUpperCase() || 'EUR',
          appointmentDate,
          appointmentTime,
          clientName,
          serviceName,
          payoutId: payout.id,
          expectedArrivalDate: expectedArrival,
          bankLastFour,
          dashboardUrl: '/account/billing',
          supportUrl: '/support',
          locale: 'en',
        },
        transactionId: `payout-${payout.id}`, // Idempotency key
      });
      console.log('✅ Marketplace payout notification sent via Novu');
    } catch (novuError) {
      console.error('❌ Failed to trigger marketplace payout notification:', novuError);
    }
  } catch (error) {
    console.error(`Error in handlePayoutPaid for payout ${payout.id}:`, error);
  }
}

export async function handlePayoutFailed(payout: Stripe.Payout) {
  console.log('Payout failed:', payout.id);

  try {
    // Extract the destination account ID - it should be a string for Connect accounts
    const destinationAccountId = typeof payout.destination === 'string' ? payout.destination : null;

    if (!destinationAccountId) {
      console.error('Invalid payout destination type:', typeof payout.destination);
      return;
    }

    // Find the user associated with this Connect account
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.stripeConnectAccountId, destinationAccountId),
    });

    if (!user) {
      console.error('User not found for Connect account:', destinationAccountId);
      return;
    }

    const amount = (payout.amount / 100).toFixed(2);
    const failureReason = payout.failure_message || 'Unknown reason';

    // Trigger Novu workflow for payout failure notification
    try {
      await triggerWorkflow({
        workflowId: 'marketplace-universal',
        to: {
          subscriberId: user.clerkUserId,
          email: user.email || 'no-email@eleva.care',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        },
        payload: {
          eventType: 'payout-failed',
          amount: `€${amount}`,
          expertName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Expert',
          accountStatus: 'action_required',
          message: `Your payout of €${amount} has failed. Reason: ${failureReason}. Please check your bank account details and contact support if needed.`,
        },
        transactionId: `payout-failed-${payout.id}`,
      });
      console.log('✅ Marketplace payout failure notification sent via Novu');
    } catch (novuError) {
      console.error('❌ Failed to trigger marketplace payout failure notification:', novuError);
    }
  } catch (error) {
    console.error(`Error in handlePayoutFailed for payout ${payout.id}:`, error);
  }
}
