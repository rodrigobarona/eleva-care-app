import { getSecureSubscriberData } from '@/app/utils/novu';
import { isAdmin } from '@/lib/auth/roles.server';
import { getAuth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Common handler for subscriber hash requests
 * Handles both GET (current user) and POST (admin can access any user) scenarios
 */
async function handleSubscriberHashRequest(
  userId: string,
  requestedSubscriberId?: string,
): Promise<NextResponse> {
  try {
    // Use the authenticated user's ID if no specific ID is requested
    const subscriberId = requestedSubscriberId || userId;

    // Security check: only admins can access other users' hashes
    if (subscriberId !== userId) {
      const userIsAdmin = await isAdmin();

      if (!userIsAdmin) {
        return NextResponse.json(
          { error: 'Can only generate hash for your own subscriber ID' },
          { status: 403 },
        );
      }
    }

    // Generate secure subscriber data
    const secureData = getSecureSubscriberData(subscriberId);

    return NextResponse.json({
      success: true,
      data: secureData,
    });
  } catch (error) {
    console.error('Error generating subscriber hash:', error);
    return NextResponse.json(
      { error: 'Failed to generate secure subscriber data' },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint: Returns HMAC-hashed subscriber data for the current authenticated user
 * This is the primary endpoint for users to get their own subscriber hash for Novu authentication
 *
 * @param request - The incoming request
 * @returns JSON response with subscriberId and subscriberHash
 */
export async function GET(request: NextRequest) {
  const { userId } = getAuth(request);

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized - User must be authenticated' },
      { status: 401 },
    );
  }

  return handleSubscriberHashRequest(userId);
}

/**
 * POST endpoint: Accepts subscriberId parameter for admin use
 * Allows admins to get any subscriber's hash, regular users can only get their own
 * This is useful for admin tools and debugging purposes
 *
 * @param request - The incoming request with subscriberId in body
 * @returns JSON response with subscriberId and subscriberHash
 */
export async function POST(request: NextRequest) {
  const { userId } = getAuth(request);

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized - User must be authenticated' },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { subscriberId } = body;

    if (!subscriberId) {
      return NextResponse.json({ error: 'subscriberId is required' }, { status: 400 });
    }

    return handleSubscriberHashRequest(userId, subscriberId);
  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json({ error: 'Invalid request body - JSON expected' }, { status: 400 });
  }
}
