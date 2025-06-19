import { ENV_CONFIG } from '@/config/env';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET endpoint: Returns secure subscriber data with HMAC hash
 * This endpoint generates a secure hash for Novu authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For manual subscriberId (useful for testing or external calls)
    const { searchParams } = new URL(request.url);
    const manualSubscriberId = searchParams.get('subscriberId');
    const subscriberId = manualSubscriberId || userId;

    // Generate HMAC hash for secure authentication
    let subscriberHash = '';
    if (ENV_CONFIG.NOVU_SECRET_KEY) {
      subscriberHash = crypto
        .createHmac('sha256', ENV_CONFIG.NOVU_SECRET_KEY)
        .update(subscriberId)
        .digest('hex');
    }

    const secureData = {
      subscriberId,
      subscriberHash,
      applicationIdentifier: ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER,
    };

    return NextResponse.json(secureData);
  } catch (error) {
    console.error('Error generating subscriber hash:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
