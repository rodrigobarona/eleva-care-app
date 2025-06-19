import { NextRequest, NextResponse } from 'next/server';

/**
 * GET endpoint: Returns subscriber data for compatibility
 * In the modern simplified setup, HMAC authentication is not used
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subscriberId = searchParams.get('subscriberId');

  if (!subscriberId) {
    return NextResponse.json({ error: 'subscriberId is required' }, { status: 400 });
  }

  try {
    // In the simplified modern setup, HMAC authentication is not used
    // Return the subscriber data without hash for compatibility
    const secureData = {
      subscriberId,
      subscriberHash: '', // Empty since we're not using HMAC in simplified setup
    };

    return NextResponse.json(secureData);
  } catch (error) {
    console.error('Error generating subscriber hash:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
