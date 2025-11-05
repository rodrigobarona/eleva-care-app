import { ENV_CONFIG } from '@/config/env';
import { withAuth } from '@workos-inc/authkit-nextjs';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET endpoint: Returns secure subscriber data with HMAC hash
 * This endpoint generates a secure hash for Novu authentication
 */
export async function GET(_request: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const { user } = await withAuth();
  const userId = user?.id;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the authenticated userId as subscriberId
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
