import { handleGoogleAccountConnection } from '@/server/actions/expert-setup';
import { WebhookEvent } from '@clerk/nextjs/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Webhook signing secret from Clerk Dashboard
const webhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

if (!webhookSecret) {
  throw new Error(
    'Please add CLERK_WEBHOOK_SIGNING_SECRET from Clerk Dashboard to .env or .env.local',
  );
}

type ClerkEventType =
  | 'email.created'
  | 'organization.created'
  | 'organization.deleted'
  | 'organization.updated'
  | 'organizationDomain.created'
  | 'organizationDomain.deleted'
  | 'organizationDomain.updated'
  | 'organizationInvitation.accepted'
  | 'organizationInvitation.created'
  | 'organizationInvitation.revoked'
  | 'organizationMembership.created'
  | 'organizationMembership.deleted'
  | 'organizationMembership.updated'
  | 'permission.created'
  | 'permission.deleted'
  | 'permission.updated'
  | 'role.created'
  | 'role.deleted'
  | 'role.updated'
  | 'session.created'
  | 'session.ended'
  | 'session.pending'
  | 'session.removed'
  | 'session.revoked'
  | 'sms.created'
  | 'user.created'
  | 'user.deleted'
  | 'user.updated'
  | 'waitlistEntry.created'
  | 'waitlistEntry.updated';

async function handleClerkEvent(evt: WebhookEvent) {
  const eventType = evt.type as ClerkEventType;
  const { id } = evt.data;

  console.log(`Processing ${eventType} event for ID: ${id}`);

  try {
    switch (eventType) {
      // User events
      case 'user.created':
        // Handle new user creation
        console.log('New user created:', id);
        break;

      case 'user.updated':
        // Handle user updates (including Google account changes)
        console.log('User updated:', id);
        await handleGoogleAccountConnection();
        break;

      case 'user.deleted':
        // Handle user deletion
        console.log('User deleted:', id);
        break;

      // Organization events
      case 'organization.created':
      case 'organization.updated':
      case 'organization.deleted':
        console.log(`Organization ${eventType.split('.')[1]}:`, id);
        break;

      // Organization membership events
      case 'organizationMembership.created':
      case 'organizationMembership.updated':
      case 'organizationMembership.deleted':
        console.log(`Organization membership ${eventType.split('.')[1]}:`, id);
        break;

      // Organization invitation events
      case 'organizationInvitation.created':
      case 'organizationInvitation.accepted':
      case 'organizationInvitation.revoked':
        console.log(`Organization invitation ${eventType.split('.')[1]}:`, id);
        break;

      // Session events
      case 'session.created':
      case 'session.ended':
      case 'session.pending':
      case 'session.removed':
      case 'session.revoked':
        console.log(`Session ${eventType.split('.')[1]}:`, id);
        break;

      // Other events
      default:
        console.log(`Received ${eventType} event:`, id);
    }

    return true;
  } catch (error) {
    console.error(`Error processing ${eventType} event:`, error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);

    // Do something with payload
    // For this guide, log payload to console
    const { id } = evt.data;
    const eventType = evt.type;
    console.log(`Received webhook with ID ${id} and event type of ${eventType}`);
    console.log('Webhook payload:', evt.data);

    // Process the webhook
    await handleClerkEvent(evt);

    return new Response('Webhook received', { status: 200 });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error verifying webhook', { status: 400 });
  }
}
