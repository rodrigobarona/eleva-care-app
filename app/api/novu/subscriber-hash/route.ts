import { ENV_CONFIG } from '@/config/env';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET endpoint: Returns secure subscriber data with HMAC hash
 * This endpoint generates a secure hash for Novu authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params or headers (for testing)
    const { searchParams } = new URL(request.url);
    const manualSubscriberId = searchParams.get('subscriberId');

    // For now, use manual subscriber ID if provided (for testing)
    // In production, this should get the actual authenticated user
    const userId = manualSubscriberId || 'test-user';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the userId as subscriberId
    const subscriberId = userId;

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
