import { getSecureSubscriberData } from '@/app/utils/novu';
import { isAdmin } from '@/lib/auth/roles.server';
import { getAuth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Secure endpoint to get HMAC-hashed subscriber data for the current user
 * This endpoint ensures only authenticated users can get their own subscriber hash
 *
 * @param request - The incoming request
 * @returns JSON response with subscriberId and subscriberHash
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user from Clerk
    const { userId } = getAuth(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - User must be authenticated' },
        { status: 401 },
      );
    }

    // Generate secure subscriber data
    const secureData = getSecureSubscriberData(userId);

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
 * Alternative endpoint that accepts subscriberId for admin use
 * Allows admins to get any subscriber's hash, regular users can only get their own
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - User must be authenticated' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { subscriberId } = body;

    if (!subscriberId) {
      return NextResponse.json({ error: 'subscriberId is required' }, { status: 400 });
    }

    // Check if user has admin role
    const userIsAdmin = await isAdmin();

    // Allow admins to get any subscriber's hash, others only their own
    if (!userIsAdmin && subscriberId !== userId) {
      return NextResponse.json(
        { error: 'Can only generate hash for your own subscriber ID' },
        { status: 403 },
      );
    }

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
