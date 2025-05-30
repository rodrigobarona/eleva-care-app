import { triggerWorkflow } from '@/app/utils/novu';
import { UserJSON, WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
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

export async function POST(request: Request) {
  try {
    const SIGNING_SECRET = process.env.CLERK_SIGNING_SECRET;
    if (!SIGNING_SECRET) {
      throw new Error('Please add CLERK_SIGNING_SECRET from Clerk Dashboard to .env');
    }

    const webhook = new Webhook(SIGNING_SECRET);
    const headerPayload = await headers();
    const validatedHeaders = validateHeaders(headerPayload);

    const payload = await request.json();
    const body = JSON.stringify(payload);

    const event = await verifyWebhook(webhook, body, {
      'svix-id': validatedHeaders.svix_id,
      'svix-timestamp': validatedHeaders.svix_timestamp,
      'svix-signature': validatedHeaders.svix_signature,
    });

    await handleWebhookEvent(event);

    return new Response('Webhook received', { status: 200 });
  } catch (error) {
    console.error('Clerk webhook processing error:', error);
    return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      status: 400,
    });
  }
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
  return {
    ...response.data,
    eventType: response.type,
    timestamp: Date.now(),
  };
}

const validateHeaders = (headerPayload: Headers) => {
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    throw new Error('Missing Svix headers');
  }

  return { svix_id, svix_timestamp, svix_signature };
};

const verifyWebhook = async (
  webhook: Webhook,
  body: string,
  headers: { 'svix-id': string; 'svix-timestamp': string; 'svix-signature': string },
): Promise<WebhookEvent> => {
  try {
    return webhook.verify(body, headers) as WebhookEvent;
  } catch (err) {
    console.error('Error: Could not verify Clerk webhook:', err);
    throw new Error('Clerk webhook verification error');
  }
};
