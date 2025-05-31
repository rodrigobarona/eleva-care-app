import { triggerWorkflow } from '@/app/utils/novu';
import { ENV_CONFIG } from '@/config/env';
import { UserJSON, WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
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

export async function POST(request: NextRequest) {
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing Clerk webhook headers' }, { status: 400 });
  }

  if (!ENV_CONFIG.CLERK_SECRET_KEY) {
    console.error('Missing CLERK_SIGNING_SECRET');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const payload = await request.text();

  const webhook = new Webhook(ENV_CONFIG.CLERK_SECRET_KEY);

  let event: WebhookEvent;

  try {
    event = webhook.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (error) {
    console.error('Error verifying Clerk webhook:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  await handleWebhookEvent(event);

  return NextResponse.json({ message: 'Webhook received' }, { status: 200 });
}

const handleWebhookEvent = async (event: WebhookEvent) => {
  const workflow = await workflowBuilder(event);
  if (!workflow) {
    console.log(`Unsupported Clerk event type: ${event.type}`);
    return;
  }

  try {
    const subscriber = await subscriberBuilder(event);
    const payload = await payloadBuilder(event);

    console.log('Triggering Clerk workflow:', {
      workflow,
      subscriberId: subscriber.subscriberId,
      eventType: event.type,
    });

    await triggerWorkflow(workflow, subscriber, payload);
  } catch (error) {
    console.error('Error handling Clerk webhook event:', error);
    throw error;
  }
};

async function workflowBuilder(event: WebhookEvent): Promise<string | undefined> {
  if (!EVENT_TO_WORKFLOW_MAPPINGS[event.type as keyof typeof EVENT_TO_WORKFLOW_MAPPINGS]) {
    return undefined;
  }

  if (event.type === 'email.created' && event.data.slug) {
    const emailMappings = EVENT_TO_WORKFLOW_MAPPINGS['email.created'];
    const emailSlug = event.data.slug as keyof typeof emailMappings;
    return emailMappings[emailSlug] || `email-${String(emailSlug).replace(/_/g, '-')}`;
  }

  return EVENT_TO_WORKFLOW_MAPPINGS[
    event.type as keyof typeof EVENT_TO_WORKFLOW_MAPPINGS
  ] as string;
}

async function subscriberBuilder(response: WebhookEvent) {
  const userData = response.data as UserJSON;

  if (!userData.id) {
    throw new Error('Missing subscriber ID from Clerk webhook data');
  }

  return {
    subscriberId: userData.id,
    firstName: userData.first_name ?? undefined,
    lastName: userData.last_name ?? undefined,
    email:
      userData.email_addresses?.[0]?.email_address ??
      (userData as UserJSON & { to_email_address?: string }).to_email_address ??
      undefined,
    phone: userData.phone_numbers?.[0]?.phone_number ?? undefined,
    locale: 'en_US',
    avatar: userData.image_url ?? undefined,
    data: {
      clerkUserId: userData.id,
      username: userData.username ?? '',
      role: (userData.public_metadata as { role?: string })?.role ?? 'user',
    },
  };
}

async function payloadBuilder(response: WebhookEvent) {
  // Clean the payload to remove null values and ensure type compatibility
  const data = response.data as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const cleanedData: Record<string, string | number | boolean | Record<string, unknown>> = {};

  // Copy non-null values from data
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        cleanedData[key] = value;
      } else if (typeof value === 'object') {
        cleanedData[key] = value as Record<string, unknown>;
      }
    }
  }

  return {
    ...cleanedData,
    eventType: response.type,
    timestamp: Date.now(),
  };
}
