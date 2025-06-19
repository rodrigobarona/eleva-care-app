import { handleGoogleAccountConnection } from '@/server/actions/expert-setup';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);
    const { id } = evt.data;
    const eventType = evt.type;

    console.log(`Received webhook ${eventType} for ID: ${id}`);

    // Handle user.updated events for Google account changes
    if (eventType === 'user.updated') {
      await handleGoogleAccountConnection();
    }

    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Error processing webhook' }, { status: 400 });
  }
}
