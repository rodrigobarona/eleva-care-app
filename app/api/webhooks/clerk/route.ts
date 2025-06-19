import { triggerWorkflow } from '@/app/utils/novu';
import { ENV_CONFIG } from '@/config/env';
import { handleGoogleAccountConnection } from '@/server/actions/expert-setup';
import { UserJSON, WebhookEvent } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';

// Event mapping for Clerk webhooks to Novu workflows
const EVENT_TO_WORKFLOW_MAPPINGS = {
  'session.created': 'recent-login-v2',
  'user.created': 'user-created',
  'user.updated': 'user-profile-updated',
  'email.created': {
    magic_link_sign_in: 'auth-magic-link-login',
    magic_link_sign_up: 'auth-magic-link-registration',
    magic_link_user_profile: 'auth-magic-link-profile-update',
    organization_invitation: 'organization-invitation',
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

  try {
    if (!ENV_CONFIG.CLERK_WEBHOOK_SECRET) {
      throw new Error('CLERK_WEBHOOK_SECRET is required');
    }

    // Get headers and body
    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new Error('Missing required Svix headers');
    }

    const body = await request.text();
    const webhook = new Webhook(ENV_CONFIG.CLERK_WEBHOOK_SECRET);

    // Verify webhook
    const event = webhook.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;

    console.log('✅ Webhook verified, processing event:', event.type);

    // Handle the event
    await handleWebhookEvent(event);

    return NextResponse.json({ message: 'Webhook received' }, { status: 200 });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 },
    );
  }
}

/**
 * Process the verified webhook event
 */
async function handleWebhookEvent(event: WebhookEvent) {
  const workflowId = getWorkflowId(event);
  if (!workflowId) {
    console.log(`No workflow mapped for event type: ${event.type}`);
    return;
  }

  const subscriber = buildSubscriber(event);
  const payload = buildPayload(event);

  await triggerWorkflow({
    workflowId,
    to: subscriber,
    payload,
  });

  // Handle special cases
  if (event.type === 'user.created') {
    await handleGoogleAccountConnection();
  }
}

/**
 * Get workflow ID from event type
 */
function getWorkflowId(event: WebhookEvent): string | null {
  const eventType = event.type;
  const eventData = event.data as unknown as Record<string, unknown>;

  // Handle email.created events with slug-based routing
  if (eventType === 'email.created' && eventData.slug) {
    const emailMappings = EVENT_TO_WORKFLOW_MAPPINGS['email.created'];
    const slug = eventData.slug as string;
    return emailMappings[slug as keyof typeof emailMappings] || `email-${slug}`;
  }

  // Handle other events
  const mapping = EVENT_TO_WORKFLOW_MAPPINGS[eventType as keyof typeof EVENT_TO_WORKFLOW_MAPPINGS];
  return typeof mapping === 'string' ? mapping : null;
}

/**
 * Build subscriber data from webhook event
 */
function buildSubscriber(event: WebhookEvent) {
  const userData = event.data as UserJSON;
  const userDataWithId = userData as UserJSON & { user_id?: string; to_email_address?: string };

  if (!userData.id && !userDataWithId.user_id) {
    throw new Error('Missing subscriber ID from webhook data');
  }

  return {
    subscriberId: userDataWithId.user_id || userData.id,
    firstName: userData.first_name || undefined,
    lastName: userData.last_name || undefined,
    email: userData.email_addresses?.[0]?.email_address || userDataWithId.to_email_address,
    phone: userData.phone_numbers?.[0]?.phone_number || undefined,
    avatar: userData.image_url || undefined,
    data: {
      clerkUserId: userDataWithId.user_id || userData.id,
      username: userData.username || '',
    },
  };
}

/**
 * Build payload data from webhook event
 */
function buildPayload(event: WebhookEvent) {
  const cleanPayload: Record<string, string | number | boolean | null | undefined> = {
    eventType: event.type,
    timestamp: Date.now(),
  };

  // Convert event data to unknown first, then to Record
  const eventData = event.data as unknown as Record<string, unknown>;

  // Copy relevant data fields
  for (const [key, value] of Object.entries(eventData)) {
    if (value !== null && value !== undefined) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        cleanPayload[key] = value;
      }
    }
  }

  return cleanPayload;
}
