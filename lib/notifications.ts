import novu from '@/config/novu';
// Database related imports are no longer needed as NotificationTable and its functions are removed.
// import { db } from '@/drizzle/db';
// import { NotificationTable } from '@/drizzle/schema';
// import { and, desc, eq, gt, isNull, or } from 'drizzle-orm';

/**
 * Type definitions for notification creation
 */
export type NotificationType =
  | 'VERIFICATION_HELP' // Identity verification issues
  | 'ACCOUNT_UPDATE' // Account status changes
  | 'SECURITY_ALERT' // Security related notifications
  | 'SYSTEM_MESSAGE'; // General system messages

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  expiresAt?: Date;
}

/**
 * Creates a new notification for a user
 *
 * @param params Notification parameters
 * @returns Boolean indicating if the Novu trigger was attempted successfully.
 */
export async function createUserNotification(params: CreateNotificationParams): Promise<boolean> {
  try {
    const novuEventName = mapNotificationTypeToNovuEvent(params.type);
    if (!novuEventName) {
      // If no event name, it's not necessarily an error in triggering,
      // but indicates a configuration issue or an unhandled notification type.
      console.warn(`No Novu event mapping for notification type: ${params.type}. Notification not sent.`);
      return false; // Or handle as an error depending on desired strictness
    }

    await novu.trigger(novuEventName, {
      to: {
        subscriberId: params.userId,
      },
      payload: {
        title: params.title,
        message: params.message,
        actionUrl: params.actionUrl,
        // Add any other relevant data that Novu templates might need
        // internalNotificationId is removed
      },
    });
    console.log(`Novu notification triggered successfully for event: ${novuEventName}, user: ${params.userId}`);
    return true;
  } catch (novuError) {
    console.error('Error sending notification via Novu:', novuError);
    return false;
  }
}

/**
 * Maps local NotificationType to Novu event trigger IDs.
 * These event IDs/names need to be created in your Novu dashboard.
 * @param type The local notification type
 * @returns The Novu event name/ID or null if no mapping exists
 */
function mapNotificationTypeToNovuEvent(type: NotificationType): string | null {
  switch (type) {
    case 'VERIFICATION_HELP':
      return 'verification-help'; // Example: matches VERIFICATION_HELP
    case 'ACCOUNT_UPDATE':
      return 'account-update'; // Example: matches ACCOUNT_UPDATE
    case 'SECURITY_ALERT':
      return 'security-alert'; // Example: matches SECURITY_ALERT
    case 'SYSTEM_MESSAGE':
      return 'system-message'; // Example: matches SYSTEM_MESSAGE
    default:
      console.warn(`No Novu event mapping for notification type: ${type}`);
      return null;
  }
}
// Removed markNotificationAsRead and getUnreadNotifications functions
// as NotificationTable is being removed.
