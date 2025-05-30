import { Novu } from '@novu/node'; // Likely not needed if using the instance directly
import novu from '@/config/novu';
import { db } from '@/drizzle/db';
import { NotificationTable } from '@/drizzle/schema';
import { and, desc, eq, gt, isNull, or } from 'drizzle-orm';

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
 * @returns The created notification ID
 */
export async function createUserNotification(params: CreateNotificationParams): Promise<string> {
  try {
    const result = await db
      .insert(NotificationTable)
      .values({
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        actionUrl: params.actionUrl,
        expiresAt: params.expiresAt,
        read: false,
      })
      .returning({ id: NotificationTable.id });

    if (!result || result.length === 0) {
      throw new Error('Failed to create notification');
    }

    const notificationId = result[0].id;

    // --- Novu Integration ---
    try {
      const novuEventName = mapNotificationTypeToNovuEvent(params.type);
      if (novuEventName) {
        await novu.trigger(novuEventName, {
          to: {
            subscriberId: params.userId, // Ensure this aligns with your Novu subscriber ID format
          },
          payload: {
            title: params.title,
            message: params.message,
            actionUrl: params.actionUrl,
            // You can add any other relevant data here
            // For example, the notificationId from your database
            internalNotificationId: notificationId,
          },
        });
        console.log(`Novu notification triggered for event: ${novuEventName}, user: ${params.userId}`);
      }
    } catch (novuError) {
      console.error('Error sending notification via Novu:', novuError);
      // Do not re-throw; creating the DB notification is the primary goal
    }
    // --- End Novu Integration ---

    return notificationId;
  } catch (error) {
    console.error('Error creating user notification:', error);
    throw error;
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

/**
 * Marks a notification as read
 *
 * @param notificationId The ID of the notification to mark as read
 * @returns Boolean indicating success
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    await db
      .update(NotificationTable)
      .set({ read: true })
      .where(eq(NotificationTable.id, notificationId));
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Gets all unread notifications for a user
 *
 * @param userId The user ID to get notifications for
 * @returns Array of notification objects
 */
export async function getUnreadNotifications(userId: string) {
  try {
    const now = new Date();

    return await db.query.NotificationTable.findMany({
      where: and(
        eq(NotificationTable.userId, userId),
        eq(NotificationTable.read, false),
        or(isNull(NotificationTable.expiresAt), gt(NotificationTable.expiresAt, now)),
      ),
      orderBy: [desc(NotificationTable.createdAt)],
    });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return [];
  }
}
