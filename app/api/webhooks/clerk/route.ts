import {
  analyzeSessionSecurity,
  type ClerkSessionData,
  logSecurityEvent,
  shouldSendSecurityNotification,
} from '@/lib/clerk-security-utils';
import {
  buildNovuSubscriberFromClerk,
  type ClerkEventData,
  getWorkflowFromClerkEvent,
  triggerNovuWorkflow,
} from '@/lib/novu-utils';
import { updateSetupStepForUser } from '@/server/actions/expert-setup';
import { clerkClient, UserJSON, WebhookEvent } from '@clerk/nextjs/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Type for a user with external accounts that we can safely check
type UserWithExternalAccounts = UserJSON & {
  external_accounts: Array<{
    provider: string;
    verification: {
      status: string;
    };
  }>;
};

/**
 * Check if a user has a verified Google external account from webhook payload
 * @param user - The user object from webhook payload
 * @returns boolean indicating if the user has a verified Google account
 */
function hasVerifiedGoogleAccount(user: UserWithExternalAccounts): boolean {
  return user.external_accounts.some(
    (account) => account.provider === 'oauth_google' && account.verification?.status === 'verified',
  );
}

/**
 * Check if a user has an expert role from webhook payload
 * @param user - The user object from webhook payload
 * @returns boolean indicating if the user has an expert role
 */
function hasExpertRole(user: UserJSON): boolean {
  const roles = Array.isArray(user.public_metadata?.role)
    ? (user.public_metadata.role as string[])
    : [user.public_metadata?.role as string];

  return roles.some((role: string) => role === 'community_expert' || role === 'top_expert');
}

/**
 * Handle Google account connection updates for expert users
 * This function works with webhook payload data instead of auth() context
 * @param user - The user object from webhook payload
 * @returns Promise<boolean> indicating if the update was successful
 */
async function handleGoogleAccountConnectionFromWebhook(
  user: UserWithExternalAccounts,
): Promise<boolean> {
  try {
    console.log(`🔍 Processing Google account connection for user ${user.id} from webhook`);

    // Check if user has an expert role first
    const isExpert = hasExpertRole(user);
    if (!isExpert) {
      console.log(`ℹ️ User ${user.id} is not an expert, skipping expert setup metadata update`);
      return false;
    }

    // Check if user has a verified Google external account
    const hasVerifiedGoogle = hasVerifiedGoogleAccount(user);

    console.log(`🔍 User ${user.id} has ${hasVerifiedGoogle ? 'a' : 'no'} verified Google account`);

    // Get current expert setup data from user metadata
    const currentSetup = (user.unsafe_metadata?.expertSetup as Record<string, boolean>) || {};
    const currentGoogleStatus = currentSetup.google_account === true;

    // Only update if the status has changed
    if (currentGoogleStatus !== hasVerifiedGoogle) {
      console.log(
        `📝 Updating Google account connection status from ${currentGoogleStatus} to ${hasVerifiedGoogle} for expert user ${user.id}`,
      );

      // Use the webhook-friendly function to update the step status
      const result = await updateSetupStepForUser('google_account', user.id, hasVerifiedGoogle);

      if (result.success) {
        console.log(
          `✅ Successfully updated Google account connection status to ${hasVerifiedGoogle} for expert user ${user.id}`,
        );
        return true;
      } else {
        console.error(
          `❌ Failed to update Google account status for user ${user.id}:`,
          result.error,
        );
        return false;
      }
    } else {
      console.log(`ℹ️ Google account status already up to date for user ${user.id}`);
      return true;
    }
  } catch (error) {
    console.error('Error handling Google account connection from webhook:', error);
    return false;
  }
}

/**
 * Handle different types of Clerk webhook events
 * @param evt - The verified webhook event
 */
async function handleClerkEvent(evt: WebhookEvent) {
  const eventType = evt.type;
  const { id } = evt.data;

  console.log(`Processing ${eventType} event for ID: ${id}`);

  try {
    // Handle existing business logic
    switch (eventType) {
      case 'user.created':
        console.log('New user created:', id);
        // For new users, we might want to initialize their expert setup
        break;

      case 'user.updated':
        console.log('User updated:', id);

        // Handle Google account connection updates for expert users
        if (evt.data && typeof evt.data === 'object' && 'external_accounts' in evt.data) {
          const user = evt.data as UserWithExternalAccounts;
          await handleGoogleAccountConnectionFromWebhook(user);
        }
        break;

      case 'user.deleted':
        console.log('User deleted:', id);
        break;

      case 'session.created':
      case 'session.ended':
      case 'session.removed':
      case 'session.revoked':
        console.log(`Session ${eventType.split('.')[1]}:`, id);
        break;

      default:
        console.log(`Received ${eventType} event:`, id);
    }

    // 🔔 NEW: Trigger Novu notification workflows
    await triggerNovuNotificationFromClerkEvent(evt);

    return true;
  } catch (error) {
    console.error(`Error processing ${eventType} event:`, error);
    throw error;
  }
}

/**
 * Trigger Novu notification workflows based on Clerk events
 * @param evt - The verified webhook event
 */
async function triggerNovuNotificationFromClerkEvent(evt: WebhookEvent) {
  try {
    // Smart filtering for security events - avoid notification spam
    if (evt.type === 'session.removed') {
      console.log(`🔕 Skipping notification for session.removed - normal logout behavior`);
      return;
    }

    if (evt.type === 'session.created') {
      // Use Clerk's session data for intelligent security analysis
      const sessionData = evt.data as ClerkSessionData;

      if (sessionData.user_id) {
        // Analyze session for security risks using Clerk's built-in data
        const securityAnalysis = await analyzeSessionSecurity(sessionData, sessionData.user_id);

        // Check user's notification preferences
        const userWantsNotifications = await shouldSendSecurityNotification(sessionData.user_id);

        // Log security event for audit trail
        logSecurityEvent({
          userId: sessionData.user_id,
          sessionId: sessionData.id,
          eventType: 'session.created',
          riskScore: securityAnalysis.riskScore,
          action: securityAnalysis.shouldNotify && userWantsNotifications ? 'notified' : 'ignored',
          reason: securityAnalysis.reason,
        });

        // Only proceed with notification if analysis indicates risk AND user wants notifications
        if (!securityAnalysis.shouldNotify || !userWantsNotifications) {
          console.log(`🔕 Skipping security notification: ${securityAnalysis.reason}`);
          return;
        }

        console.log(`🔔 Security notification warranted: ${securityAnalysis.reason}`);
      } else {
        console.log(`🔔 Login detected - no user_id available for analysis`);
      }
    }

    // Check if we have a workflow mapped for this event
    const workflowId = getWorkflowFromClerkEvent(evt.type, evt.data as unknown as ClerkEventData);

    if (!workflowId) {
      console.log(`🔕 No Novu workflow mapped for Clerk event: ${evt.type}`);
      return;
    }

    // Build subscriber data from Clerk user data
    // For session events, we need to use the user_id from the session data
    let subscriber;
    if (evt.type.startsWith('session.')) {
      // For session events, create subscriber from session data
      const sessionData = evt.data as {
        id: string;
        user_id?: string;
        client_id?: string;
        status?: string;
      };

      // Try to fetch user data to get email for notifications
      let userEmail: string | undefined;
      let userFirstName: string | undefined;
      let userLastName: string | undefined;

      if (sessionData.user_id) {
        try {
          const user = await (await clerkClient()).users.getUser(sessionData.user_id);
          userEmail = user.emailAddresses?.[0]?.emailAddress;
          userFirstName = user.firstName || undefined;
          userLastName = user.lastName || undefined;
        } catch (error) {
          console.warn(`Could not fetch user data for ${sessionData.user_id}:`, error);
        }
      }

      subscriber = {
        subscriberId: sessionData.user_id || sessionData.id,
        email: userEmail,
        firstName: userFirstName,
        lastName: userLastName,
        data: {
          sessionId: sessionData.id,
          clientId: sessionData.client_id || 'unknown',
          eventType: evt.type,
        },
      };
    } else {
      // For user events, use the full user data
      subscriber = buildNovuSubscriberFromClerk(evt.data as UserJSON);
    }

    // Create payload with event data
    const payload = {
      eventType: evt.type,
      eventId: evt.data.id,
      userId: evt.type.startsWith('session.')
        ? (evt.data as { user_id?: string; id: string }).user_id || evt.data.id
        : evt.data.id, // Extract user_id from session data or use event id
      eventData: evt.data,
      timestamp: Date.now(),
      source: 'clerk_webhook',
      // Add additional fields for security-auth workflow
      alertType: evt.type === 'session.created' ? 'recent-login' : evt.type,
      message:
        evt.type === 'session.created'
          ? 'New login detected on your account'
          : `Session event: ${evt.type}`,
    };

    // Trigger the Novu workflow
    console.log(`🔔 Triggering Novu workflow '${workflowId}' for Clerk event '${evt.type}'`);
    console.log('📋 Payload being sent to Novu:', JSON.stringify(payload, null, 2));
    console.log('👤 Subscriber being sent to Novu:', JSON.stringify(subscriber, null, 2));
    const result = await triggerNovuWorkflow(workflowId, subscriber, payload);

    if (result.success) {
      console.log(`✅ Successfully triggered Novu workflow for Clerk event: ${evt.type}`);
    } else {
      console.error(`❌ Failed to trigger Novu workflow for Clerk event:`, result.error);
    }
  } catch (error) {
    console.error('Error triggering Novu notification from Clerk event:', error);
    // Don't throw - we don't want Novu failures to break webhook processing
  }
}

export async function POST(req: NextRequest) {
  try {
    // Capture IP address and geolocation from Vercel headers for security analysis
    const ipAddress =
      req.headers.get('x-vercel-forwarded-for') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      req.headers.get('cf-connecting-ip') || // Cloudflare fallback
      'unknown';

    // Capture Vercel's built-in geolocation data (free and reliable)
    const vercelGeoData = {
      country: req.headers.get('x-vercel-ip-country'),
      countryRegion: req.headers.get('x-vercel-ip-country-region'),
      city: req.headers.get('x-vercel-ip-city'),
      latitude: req.headers.get('x-vercel-ip-latitude'),
      longitude: req.headers.get('x-vercel-ip-longitude'),
      timezone: req.headers.get('x-vercel-ip-timezone'),
    };

    // Verify the webhook using Clerk's official method
    const evt = await verifyWebhook(req);

    // Log the webhook details with enhanced geolocation info
    const { id } = evt.data;
    const eventType = evt.type;
    console.log(
      `Received webhook with ID ${id} and event type of ${eventType} from IP: ${ipAddress}`,
    );
    if (vercelGeoData.country) {
      console.log(
        `📍 Location: ${vercelGeoData.city || 'Unknown'}, ${vercelGeoData.countryRegion || ''} ${vercelGeoData.country}`,
      );
    }
    console.log('Webhook payload:', evt.data);

    // Add IP address and geolocation data to session data for security analysis
    if (evt.type.startsWith('session.') && evt.data) {
      const sessionData = evt.data as unknown as Record<string, unknown>;
      sessionData.ipAddress = ipAddress;
      sessionData.vercelGeoData = vercelGeoData;
    }

    // Process the webhook
    await handleClerkEvent(evt);

    return new Response('Webhook received', { status: 200 });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error verifying webhook', { status: 400 });
  }
}
