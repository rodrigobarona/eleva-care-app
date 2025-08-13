import { NOTIFICATION_TYPE_ACCOUNT_UPDATE } from '@/lib/constants/notifications';
import { sendNovuEmailEnhanced } from '@/lib/novu-email-service';

import { createUserNotification } from './notifications';
import { formatCurrency } from './utils';

/**
 * Create a notification for an upcoming payout
 * This should be called when a payment transfer record is created or updated
 */
export async function createUpcomingPayoutNotification({
  userId,
  amount,
  currency,
  payoutDate,
  sessionDate,
  eventId,
  expert,
}: {
  userId: string;
  amount: number;
  currency: string;
  payoutDate: Date;
  sessionDate?: Date;
  eventId: string;
  expert?: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
}) {
  const formattedAmount = formatCurrency(amount, currency);
  const formattedPayoutDate = payoutDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let message = `You will receive a payment of ${formattedAmount} on ${formattedPayoutDate}.`;

  // Add session date info if available
  if (sessionDate) {
    const formattedSessionDate = sessionDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    message = `You will receive a payment of ${formattedAmount} on ${formattedPayoutDate} for your session on ${formattedSessionDate}.`;
  }

  try {
    return await createUserNotification({
      userId,
      type: NOTIFICATION_TYPE_ACCOUNT_UPDATE,
      data: {
        userName: expert?.firstName ?? 'Expert', // Use expert name from user data
        title: `Upcoming Payout: ${formattedAmount}`,
        message,
        actionUrl: `/events/${eventId}`,
        amount: formattedAmount,
        payoutDate: formattedPayoutDate,
        eventId,
        email: expert?.email ?? undefined, // Pass email for Novu, converting null to undefined
        firstName: expert?.firstName ?? undefined, // Pass firstName for Novu, converting null to undefined
      },
    });
  } catch (error) {
    console.error('Failed to create upcoming payout notification:', error);
    return null;
  }
}

/**
 * Create a notification when a payout has been initiated
 * This should be called when a transfer has been successfully created
 * Now includes both in-app notification AND email via Novu + React Email
 */
export async function createPayoutCompletedNotification({
  userId,
  amount,
  currency,
  eventId,
  expertName,
  clientName,
  serviceName,
  appointmentDate,
  appointmentTime,
  payoutId,
  expertEmail,
}: {
  userId: string;
  amount: number;
  currency: string;
  eventId: string;
  expertName?: string;
  clientName?: string;
  serviceName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  payoutId?: string;
  expertEmail?: string;
}) {
  const formattedAmount = formatCurrency(amount, currency);

  try {
    // Create in-app notification (existing functionality)
    const notificationResult = await createUserNotification({
      userId,
      type: NOTIFICATION_TYPE_ACCOUNT_UPDATE,
      data: {
        userName: expertName || 'Expert',
        title: `💰 Payout Sent: ${formattedAmount}`,
        message: `Your earnings of ${formattedAmount} have been sent to your bank account. Expected arrival: 1-2 business days.`,
        actionUrl: `/events/${eventId}`,
        amount: formattedAmount,
        eventId,
        payoutId,
      },
    });

    // Send beautiful email notification via Novu (NEW!)
    if (expertEmail) {
      try {
        // Calculate expected arrival date (1-2 business days)
        const expectedArrival = new Date();
        expectedArrival.setDate(expectedArrival.getDate() + 2); // Add 2 business days buffer
        const expectedArrivalDate = expectedArrival.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        await sendNovuEmailEnhanced({
          workflowId: 'expert-payout-notification',
          subscriberId: userId,
          templateType: 'expert-payout-notification',
          templateData: {
            expertName: expertName || 'Expert',
            payoutAmount: (amount / 100).toFixed(2), // Convert from cents to currency units
            currency,
            appointmentDate: appointmentDate || 'Recent appointment',
            appointmentTime: appointmentTime || 'N/A',
            clientName: clientName || 'Client',
            serviceName: serviceName || 'Professional consultation',
            payoutId: payoutId || 'N/A',
            expectedArrivalDate,
            bankLastFour: '••••', // This should come from Stripe Connect account details
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/earnings`,
            supportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/support`,
            locale: 'en',
          },
          userSegment: 'expert',
          templateVariant: 'default',
          locale: 'en',
          overrides: {
            email: {
              to: expertEmail,
              subject: `💰 Payout sent: ${currency} ${(amount / 100).toFixed(2)} for your appointment with ${clientName || 'client'}`,
            },
          },
        });

        console.log(`✉️ Payout email notification sent to ${expertEmail} for expert ${userId}`);
      } catch (emailError) {
        console.error('❌ Failed to send payout email notification:', emailError);
        // Don't fail the entire function if email fails
      }
    } else {
      console.warn(
        `⚠️ No email address provided for expert ${userId}, skipping email notification`,
      );
    }

    return notificationResult;
  } catch (error) {
    console.error('Failed to create payout completed notification:', error);
    return null;
  }
}

/**
 * Create a notification when there's an issue with a payout
 * This should be called when a transfer fails
 */
export async function createPayoutFailedNotification({
  userId,
  amount,
  currency,
  errorMessage,
}: {
  userId: string;
  amount: number;
  currency: string;
  errorMessage: string;
}) {
  const formattedAmount = formatCurrency(amount, currency);

  try {
    return await createUserNotification({
      userId,
      type: NOTIFICATION_TYPE_ACCOUNT_UPDATE,
      data: {
        userName: 'Expert', // Default username for payment notifications
        title: 'Payment Issue: Action Required',
        message: `We encountered an issue sending your payment of ${formattedAmount}. Error: ${errorMessage}. Please check your Stripe account settings.`,
        actionUrl: '/account/billing',
        amount: formattedAmount,
        errorMessage,
      },
    });
  } catch (error) {
    console.error('Failed to create payout failed notification:', error);
    return null;
  }
}
