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

    return result[0].id;
  } catch (error) {
    console.error('Error creating user notification:', error);
    throw error;
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
