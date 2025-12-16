import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema';
import { getIdentityVerificationStatus } from '@/lib/integrations/stripe/identity';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Add route segment config
export const preferredRegion = 'auto';
export const maxDuration = 60;

// Add GET handler to quickly return 405 Method Not Allowed
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

// Handle POST requests from Stripe webhooks
export async function POST(request: Request) {
  let eventType = 'unknown';
  let eventId = 'unknown';

  try {
    // Log the request info (useful for debugging)
    console.log('Received webhook request to /api/webhooks/stripe-identity');

    if (!process.env.STRIPE_IDENTITY_WEBHOOK_SECRET) {
      console.error('Missing STRIPE_IDENTITY_WEBHOOK_SECRET environment variable');
      throw new Error('Missing STRIPE_IDENTITY_WEBHOOK_SECRET environment variable');
    }

    // Get the raw body as text
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature header');
      return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
    });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_IDENTITY_WEBHOOK_SECRET,
      );

      eventType = event.type;
      eventId = event.id;
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Received Stripe Identity webhook event:', {
      type: event.type,
      id: event.id,
      timestamp: new Date().toISOString(),
    });

    // Handle identity verification events
    if (event.type.startsWith('identity.verification_session')) {
      await handleVerificationSessionEvent(event);
    }

    return NextResponse.json({ received: true, status: 'success' });
  } catch (error) {
    console.error('Error processing webhook:', {
      error,
      eventType,
      eventId,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 },
    );
  }
}

async function handleVerificationSessionEvent(event: Stripe.Event) {
  try {
    const session = event.data.object as Stripe.Identity.VerificationSession;
    const verificationId = session.id;

    console.log('Processing verification session event:', {
      sessionId: verificationId,
      status: session.status,
      eventType: event.type,
      metadata: session.metadata,
      verificationFlow: session.verification_flow || 'No verification flow specified',
    });

    // Try to find user by verification ID first
    let user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.stripeIdentityVerificationId, verificationId),
    });

    // If no user found by verification ID, check metadata for workosUserId
    if (!user && session.metadata && session.metadata.workosUserId) {
      const workosUserId = session.metadata.workosUserId as string;
      console.log('Looking up user by WorkOS ID from metadata:', workosUserId);

      user = await db.query.UsersTable.findFirst({
        where: eq(UsersTable.workosUserId, workosUserId),
      });

      // If we found a user, update their verification ID
      if (user) {
        await db
          .update(UsersTable)
          .set({
            stripeIdentityVerificationId: verificationId,
            updatedAt: new Date(),
          })
          .where(eq(UsersTable.id, user.id));
      }
    }

    if (!user) {
      console.error('No user found for verification session:', {
        verificationId,
        metadata: session.metadata,
      });
      return;
    }

    // Get detailed status
    const verificationStatus = await getIdentityVerificationStatus(verificationId);

    const isVerified = verificationStatus.status === 'verified';

    // Update user verification status in database
    await db
      .update(UsersTable)
      .set({
        stripeIdentityVerified: isVerified,
        stripeIdentityVerificationStatus: verificationStatus.status,
        stripeIdentityVerificationLastChecked: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(UsersTable.id, user.id));

    console.log('Updated user verification status:', {
      userId: user.id,
      workosUserId: user.workosUserId,
      status: verificationStatus.status,
      lastChecked: new Date().toISOString(),
      verificationFlow: session.verification_flow || 'Standard flow',
    });

    // If verification is verified, add to expert onboarding progress
    if (isVerified) {
      try {
        // Note: markStepComplete now gets user from auth context
        // For webhooks, expert setup completion should be tracked separately
        console.log(`Identity verification completed for user ${user.workosUserId}`);

        // Now sync the identity verification to the Connect account if it exists
        try {
          // Check if user has a Connect account first
          if (!user.stripeConnectAccountId) {
            console.log('User has no Connect account yet, skipping sync:', user.workosUserId);
            return;
          }

          // Retry the sync up to 3 times with exponential backoff
          let syncSuccess = false;
          let lastError: Error | null = null;

          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              console.log(
                `Syncing identity verification attempt ${attempt} for user ${user.workosUserId}`,
              );

              const { syncIdentityVerificationToConnect } = await import(
                '@/lib/integrations/stripe'
              );
              const result = await syncIdentityVerificationToConnect(user.workosUserId);

              if (result.success) {
                console.log(
                  `Successfully synced identity verification to Connect account for user ${user.workosUserId}`,
                  {
                    attempt,
                    verificationStatus: result.verificationStatus,
                  },
                );
                syncSuccess = true;
                break;
              } else {
                console.log(`Sync attempt ${attempt} failed: ${result.message}`);
                lastError = new Error(result.message);

                // Wait before retrying (exponential backoff)
                if (attempt < 3) {
                  const delay = attempt * 1000; // 1s, 2s, 3s
                  await new Promise((resolve) => setTimeout(resolve, delay));
                }
              }
            } catch (syncError) {
              console.error(`Error in sync attempt ${attempt}:`, syncError);
              lastError = syncError instanceof Error ? syncError : new Error('Unknown error');

              // Wait before retrying (exponential backoff)
              if (attempt < 3) {
                const delay = attempt * 1000;
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            }
          }

          // Log outcome after all attempts
          if (!syncSuccess) {
            console.error('All attempts to sync identity verification failed:', {
              userId: user.id,
              workosUserId: user.workosUserId,
              errorMessage: lastError?.message || 'Unknown error',
            });
          }
        } catch (syncError) {
          console.error('Unhandled error in identity sync process:', syncError);
        }
      } catch (error) {
        console.error('Failed to mark identity step as complete:', error);
      }
    }
  } catch (error) {
    console.error('Error handling verification session event:', error);
    throw error;
  }
}
