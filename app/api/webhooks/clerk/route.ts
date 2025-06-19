import { triggerWorkflow } from '@/app/utils/novu';
import { ENV_CONFIG } from '@/config/env';
import { handleGoogleAccountConnection } from '@/server/actions/expert-setup';
import { UserJSON, WebhookEvent } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';

// Single source of truth for all supported Clerk events and their corresponding Novu workflows
const EVENT_TO_WORKFLOW_MAPPINGS = {
  // Session events
  'session.created': 'recent-login-v2',

  // User events
  'user.created': 'user-created',
  'user.updated': 'user-profile-updated',

  // Email events
  'email.created': {
    magic_link_sign_in: 'auth-magic-link-login',
    magic_link_sign_up: 'auth-magic-link-registration',
    magic_link_user_profile: 'profile-magic-link-update',
    organization_invitation: 'organization-invitation-v2',
    organization_invitation_accepted: 'org-member-joined',
    passkey_added: 'security-passkey-created',
    passkey_removed: 'security-passkey-deleted',
    password_changed: 'security-password-updated',
    password_removed: 'security-password-deleted',
    primary_email_address_changed: 'profile-email-updated',
    reset_password_code: 'reset-password-code-v2',
    verification_code: 'verification-code-v2',
    waitlist_confirmation: 'waitlist-signup-confirmed',
    waitlist_invitation: 'waitlist-access-granted',
    invitation: 'user-invitation',
  },
} as const;

// Explicitly export allowed HTTP methods
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('📥 Received Clerk webhook request');

  // Get headers from the request
  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('❌ Missing required Svix headers');
    return NextResponse.json({ error: 'Missing required headers' }, { status: 400 });
  }

  const payload = await request.text();
  const body = JSON.stringify(JSON.parse(payload));

  // Create new Svix instance
  const wh = new Webhook(ENV_CONFIG.CLERK_WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload against the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('❌ Error verifying webhook:', err);
    return NextResponse.json({ error: 'Error verifying webhook' }, { status: 400 });
  }

  console.log(`✅ Verified webhook with event type: ${evt.type}`);

  try {
    // Handle the webhook event
    await handleWebhookEvent(evt);

    return NextResponse.json({ success: true, eventType: evt.type }, { status: 200 });
  } catch (error) {
    console.error('❌ Error processing webhook event:', error);
    return NextResponse.json({ error: 'Error processing webhook event' }, { status: 500 });
  }
}

/**
 * Handle the verified webhook event
 */
const handleWebhookEvent = async (event: WebhookEvent) => {
  const workflowId = await workflowBuilder(event);
  if (!workflowId) {
    console.log(`ℹ️ Unsupported event type: ${event.type}`);
    return;
  }

  const subscriber = await subscriberBuilder(event);
  const payload = await payloadBuilder(event);

  console.log('🚀 Triggering Novu workflow:', {
    workflowId,
    subscriberId: subscriber.subscriberId,
    eventType: event.type,
  });

  // Use the new trigger function with modern API
  const result = await triggerWorkflow({
    workflowId,
    to: subscriber,
    payload,
    // Add actor information for audit trails
    actor: {
      subscriberId: 'system',
      data: {
        source: 'clerk-webhook',
        eventType: event.type,
        timestamp: new Date().toISOString(),
      },
    },
  });

  if (result) {
    console.log('✅ Successfully triggered Novu workflow');
  } else {
    console.warn('⚠️ Failed to trigger Novu workflow');
  }

  // Handle special cases that require additional processing
  if (event.type === 'user.created' && event.data) {
    await handleGoogleAccountConnection();
  }
};

/**
 * Build the workflow ID from the event
 */
async function workflowBuilder(event: WebhookEvent): Promise<string | undefined> {
  const eventMapping =
    EVENT_TO_WORKFLOW_MAPPINGS[event.type as keyof typeof EVENT_TO_WORKFLOW_MAPPINGS];

  if (!eventMapping) {
    return undefined;
  }

  // Handle email events with sub-types
  if (event.type === 'email.created' && event.data?.slug) {
    const emailMappings = EVENT_TO_WORKFLOW_MAPPINGS['email.created'];
    const emailSlug = event.data.slug as keyof typeof emailMappings;
    return emailMappings[emailSlug] || `email-${String(emailSlug).replace(/_/g, '-')}`;
  }

  return eventMapping as string;
}

/**
 * Build subscriber data from the webhook event
 */
async function subscriberBuilder(event: WebhookEvent) {
  const userData = event.data as UserJSON;

  if (!userData.id) {
    throw new Error('Missing subscriber ID from webhook data');
  }

  // Type assertion for user_id field that might exist in some events
  const userDataWithId = userData as UserJSON & { user_id?: string; to_email_address?: string };

  return {
    subscriberId: userDataWithId.user_id ?? userData.id,
    firstName: userData.first_name ?? undefined,
    lastName: userData.last_name ?? undefined,
    email:
      userData.email_addresses?.[0]?.email_address ?? userDataWithId.to_email_address ?? undefined,
    phone: userData.phone_numbers?.[0]?.phone_number ?? undefined,
    locale: 'en_US',
    avatar: userData.image_url ?? undefined,
    data: {
      clerkUserId: userDataWithId.user_id ?? userData.id,
      username: userData.username ?? '',
      createdAt: userData.created_at || 0,
      updatedAt: userData.updated_at || 0,
      lastSignInAt: userData.last_sign_in_at || 0,
    },
  };
}

/**
 * Build payload data from the webhook event
 */
async function payloadBuilder(event: WebhookEvent) {
  // Clean the payload to remove null values and ensure type compatibility
  const cleanedData: Record<
    string,
    string | number | boolean | Record<string, unknown> | string[] | undefined
  > = {};

  // Process each field from event.data and filter out null values
  for (const [key, value] of Object.entries(event.data)) {
    if (value !== null && value !== undefined) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        cleanedData[key] = value;
      } else if (Array.isArray(value)) {
        cleanedData[key] = value as string[];
      } else if (typeof value === 'object') {
        cleanedData[key] = value as Record<string, unknown>;
      }
    }
  }

  return {
    ...cleanedData,
    eventType: event.type,
    timestamp: new Date().toISOString(),
    source: 'clerk',
  };
}
