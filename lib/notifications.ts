import { securityAuthWorkflow, userLifecycleWorkflow } from '@/config/novu';
import {
  NOTIFICATION_TYPE_ACCOUNT_UPDATE,
  NOTIFICATION_TYPE_SECURITY_ALERT,
  NOTIFICATION_TYPE_SYSTEM_MESSAGE,
  NOTIFICATION_TYPE_VERIFICATION_HELP,
  type NotificationType,
} from '@/lib/constants/notifications';

/**
 * Type definitions for notification creation
 */
export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  data?: Record<string, unknown>;
}

/**
 * Creates a new notification for a user via Novu workflows
 *
 * @param params Notification parameters
 * @returns Boolean indicating if the workflow trigger was successful.
 */
export async function createUserNotification(params: CreateNotificationParams): Promise<boolean> {
  try {
    const { userId, type, data = {} } = params;

    // Map notification type to workflow and trigger
    switch (type) {
      case NOTIFICATION_TYPE_VERIFICATION_HELP:
        await securityAuthWorkflow.trigger({
          to: userId,
          payload: {
            eventType: 'account-verification',
            userId,
            verificationUrl: (data.verificationUrl as string) || undefined,
            ...data,
          },
        });
        break;

      case NOTIFICATION_TYPE_ACCOUNT_UPDATE:
        await userLifecycleWorkflow.trigger({
          to: userId,
          payload: {
            eventType: 'welcome',
            userName: (data.userName as string) || 'User',
            ...data,
          },
        });
        break;

      case NOTIFICATION_TYPE_SECURITY_ALERT:
        await securityAuthWorkflow.trigger({
          to: userId,
          payload: {
            eventType: 'security-alert',
            userId,
            alertType: (data.alertType as string) || undefined,
            message: (data.message as string) || 'Security alert notification',
            ...data,
          },
        });
        break;

      case NOTIFICATION_TYPE_SYSTEM_MESSAGE:
        await securityAuthWorkflow.trigger({
          to: userId,
          payload: {
            eventType: 'security-alert',
            userId,
            alertType: 'system',
            message: (data.message as string) || 'System message',
            ...data,
          },
        });
        break;

      default:
        console.warn(`No workflow mapping for notification type: ${type}. Notification not sent.`);
        return false;
    }

    console.log(`Novu workflow triggered successfully for type: ${type}, user: ${userId}`);
    return true;
  } catch (novuError) {
    console.error('Error triggering notification workflow:', novuError);
    return false;
  }
}
