import { ENV_CONFIG } from '@/config/env';
import {
  NOTIFICATION_TYPE_ACCOUNT_UPDATE,
  NOTIFICATION_TYPE_SECURITY_ALERT,
  NOTIFICATION_TYPE_SYSTEM_MESSAGE,
  NOTIFICATION_TYPE_VERIFICATION_HELP,
  type NotificationType,
} from '@/lib/constants/notifications';
import { Novu } from '@novu/api';

// Initialize Novu client
const novu = new Novu({
  secretKey: ENV_CONFIG.NOVU_SECRET_KEY,
  serverURL: ENV_CONFIG.NOVU_BASE_URL || 'https://eu.api.novu.co',
});

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
        await novu.trigger({
          workflowId: 'account-verification',
          to: { subscriberId: userId },
          payload: {
            userName: (data.userName as string) || 'User',
            firstName: (data.firstName as string) || 'User',
            profileUrl: (data.verificationUrl as string) || '/account/identity',
            ...data,
          },
        });
        break;

      case NOTIFICATION_TYPE_ACCOUNT_UPDATE:
        await novu.trigger({
          workflowId: 'user-welcome',
          to: { subscriberId: userId },
          payload: {
            userName: (data.userName as string) || 'User',
            firstName: (data.firstName as string) || 'User',
            profileUrl: (data.profileUrl as string) || '/profile',
            ...data,
          },
        });
        break;

      case NOTIFICATION_TYPE_SECURITY_ALERT:
        await novu.trigger({
          workflowId: 'security-alert',
          to: { subscriberId: userId },
          payload: {
            message: (data.message as string) || 'Security alert notification',
            alertType: (data.alertType as string) || 'general',
            timestamp: new Date().toISOString(),
            securityUrl: '/account/security',
            ...data,
          },
        });
        break;

      case NOTIFICATION_TYPE_SYSTEM_MESSAGE:
        await novu.trigger({
          workflowId: 'security-alert',
          to: { subscriberId: userId },
          payload: {
            message: (data.message as string) || 'System message',
            alertType: 'system',
            timestamp: new Date().toISOString(),
            securityUrl: '/admin/monitoring',
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
