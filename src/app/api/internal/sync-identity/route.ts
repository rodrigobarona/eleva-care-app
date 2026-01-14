import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema';
import { syncIdentityVerificationToConnect } from '@/lib/integrations/stripe';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * Mask email for GDPR/CCPA compliant logging
 * e.g., "user@example.com" → "us***@example.com"
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = local.length > 2 ? `${local.slice(0, 2)}***` : '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * Internal endpoint to sync identity verification to Stripe Connect.
 * Requires INTERNAL_ADMIN_KEY for authentication.
 *
 * Required query parameters:
 * - workosUserId: The WorkOS user ID of the user
 * - adminKey: A secret key to prevent unauthorized access (must match INTERNAL_ADMIN_KEY env var)
 */
export async function POST(request: Request) {
  try {
    // Get the clerk user ID and admin key from the query parameter
    const url = new URL(request.url);
    const workosUserId = url.searchParams.get('workosUserId');
    const adminKey = url.searchParams.get('adminKey');

    // Validate admin key to prevent unauthorized access
    if (!adminKey || adminKey !== process.env.INTERNAL_ADMIN_KEY) {
      console.warn('Unauthorized access attempt to /api/internal/sync-identity');
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    if (!workosUserId) {
      return NextResponse.json({ error: 'Missing workosUserId parameter' }, { status: 400 });
    }

    // Verify this is a valid user in our system
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, workosUserId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Log with masked email for GDPR/CCPA compliance
    console.log('Syncing identity verification for user:', {
      workosUserId,
      userId: user.id,
      email: maskEmail(user.email),
      hasIdentityVerification: !!user.stripeIdentityVerificationId,
      isVerified: !!user.stripeIdentityVerified,
    });

    // Call the sync function
    const result = await syncIdentityVerificationToConnect(workosUserId);

    // Note: Email included in response for admin use (this is an internal endpoint)
    return NextResponse.json({
      success: result.success,
      message: result.message,
      user: {
        email: user.email,
        connectAccountId: user.stripeConnectAccountId,
        identityVerificationId: user.stripeIdentityVerificationId,
        identityVerified: user.stripeIdentityVerified,
      },
    });
  } catch (error) {
    console.error('Error syncing identity verification:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
