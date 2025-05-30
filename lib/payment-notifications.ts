import { NOTIFICATION_TYPE_ACCOUNT_UPDATE } from '@/lib/constants/notifications';

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
}: {
  userId: string;
  amount: number;
  currency: string;
  payoutDate: Date;
  sessionDate?: Date;
  eventId: string;
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
        userName: 'User', // Default username
        title: `Upcoming Payout: ${formattedAmount}`,
        message,
        actionUrl: `/events/${eventId}`,
        amount: formattedAmount,
        payoutDate: formattedPayoutDate,
        eventId,
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
 */
export async function createPayoutCompletedNotification({
  userId,
  amount,
  currency,
  transferId: _transferId,
  eventId,
}: {
  userId: string;
  amount: number;
  currency: string;
  transferId: string;
  eventId: string;
}) {
  const formattedAmount = formatCurrency(amount, currency);

  try {
    return await createUserNotification({
      userId,
      type: NOTIFICATION_TYPE_ACCOUNT_UPDATE,
      data: {
        userName: 'User', // Default username
        title: `Payment Sent: ${formattedAmount}`,
        message: `Your payment of ${formattedAmount} has been sent to your Stripe account. It should arrive in your bank account within 1-2 business days.`,
        actionUrl: `/events/${eventId}`,
        amount: formattedAmount,
        eventId,
      },
    });
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
  eventId: _eventId,
}: {
  userId: string;
  amount: number;
  currency: string;
  errorMessage: string;
  eventId: string;
}) {
  const formattedAmount = formatCurrency(amount, currency);

  try {
    return await createUserNotification({
      userId,
      type: NOTIFICATION_TYPE_ACCOUNT_UPDATE,
      data: {
        userName: 'User', // Default username
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
