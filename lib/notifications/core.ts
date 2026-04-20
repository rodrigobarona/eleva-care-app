import {
  NOTIFICATION_TYPE_ACCOUNT_UPDATE,
  NOTIFICATION_TYPE_SECURITY_ALERT,
  NOTIFICATION_TYPE_SYSTEM_MESSAGE,
  NOTIFICATION_TYPE_VERIFICATION_HELP,
  type NotificationType,
} from '@/lib/constants/notifications';
import { triggerWorkflow } from '@/lib/integrations/novu';

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

    // Map notification type to workflow and trigger using proper Novu client
    switch (type) {
      case NOTIFICATION_TYPE_VERIFICATION_HELP:
        await triggerWorkflow({
          workflowId: 'security-auth',
          to: {
            subscriberId: userId,
            ...(data.email ? { email: data.email as string } : {}),
            ...(data.firstName ? { firstName: data.firstName as string } : {}),
          },
          payload: {
            eventType: 'account-verification',
            userId,
            verificationUrl: (data.verificationUrl as string) || undefined,
            ...data,
          },
        });
        break;

      case NOTIFICATION_TYPE_ACCOUNT_UPDATE:
        // ACCOUNT_UPDATE is exclusively used for expert-side notifications
        // (payment failure / refund / connect-account changes). Routing
        // through `user-lifecycle` would trigger its welcome-email step
        // and ship a "Welcome to Eleva Care!" body for events that have
        // nothing to do with onboarding — that was the original placeholder-
        // leak bug class. The right destination is `expert-management`
        // with `notificationType: 'account-update'`, which renders
        // `ExpertNotificationEmail` (a generic branded notification card)
        // and uses the supplied `message` / `actionUrl` verbatim.
        await triggerWorkflow({
          workflowId: 'expert-management',
          to: {
            subscriberId: userId,
            ...(data.email ? { email: data.email as string } : {}),
            ...(data.firstName ? { firstName: data.firstName as string } : {}),
          },
          payload: {
            notificationType: 'account-update',
            expertName: (data.userName as string) || (data.firstName as string) || 'Expert',
            message: (data.message as string) || (data.title as string) || 'Account update',
            actionUrl: (data.actionUrl as string) || undefined,
            actionText: (data.actionText as string) || undefined,
            locale: (data.locale as string) || 'en',
          },
        });
        break;

      case NOTIFICATION_TYPE_SECURITY_ALERT:
        await triggerWorkflow({
          workflowId: 'security-auth',
          to: {
            subscriberId: userId,
            ...(data.email ? { email: data.email as string } : {}),
            ...(data.firstName ? { firstName: data.firstName as string } : {}),
          },
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
        await triggerWorkflow({
          workflowId: 'security-auth',
          to: {
            subscriberId: userId,
            ...(data.email ? { email: data.email as string } : {}),
            ...(data.firstName ? { firstName: data.firstName as string } : {}),
          },
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
