import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { createUserNotification } from '@/lib/notifications';
import { markStepCompleteForUser } from '@/server/actions/expert-setup';
import { eq } from 'drizzle-orm';
import type { Stripe } from 'stripe';

export async function handleIdentityVerificationUpdated(
  verificationSession: Stripe.Identity.VerificationSession,
) {
  console.log('Identity verification updated:', verificationSession.id);

  // Find the user associated with this verification - in Stripe Identity API
  // the verification session contains a 'client_reference_id' which could be
  // the Connect account ID, user ID, or another reference
  let user = null;

  // First try to find by client_reference_id if available
  if (verificationSession.client_reference_id) {
    user = await db.query.UserTable.findFirst({
      where: eq(UserTable.stripeConnectAccountId, verificationSession.client_reference_id),
    });

    if (!user) {
      // Maybe the reference is actually a user ID?
      user = await db.query.UserTable.findFirst({
        where: eq(UserTable.id, verificationSession.client_reference_id),
      });
    }
  }

  // If we still don't have a user, check if there's an account ID in metadata
  if (!user && verificationSession.metadata?.user_id) {
    user = await db.query.UserTable.findFirst({
      where: eq(UserTable.id, verificationSession.metadata.user_id),
    });
  }

  if (!user) {
    console.error('User not found for verification session:', {
      sessionId: verificationSession.id,
      clientReference: verificationSession.client_reference_id,
      metadata: verificationSession.metadata,
    });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      // Update user record
      await tx
        .update(UserTable)
        .set({
          stripeIdentityVerificationStatus: verificationSession.status,
          updatedAt: new Date(),
        })
        .where(eq(UserTable.id, user.id));

      // Handle verification completion
      if (verificationSession.status === 'verified') {
        await markStepCompleteForUser('identity', user.clerkUserId);
        await createUserNotification({
          userId: user.id,
          type: 'VERIFICATION_HELP',
          title: 'Identity Verification Complete',
          message:
            'Your identity has been successfully verified. You can now proceed with setting up your payment account.',
          actionUrl: '/account/connect',
        });
      } else if (verificationSession.status === 'requires_input') {
        await createUserNotification({
          userId: user.id,
          type: 'VERIFICATION_HELP',
          title: 'Identity Verification Needs Attention',
          message:
            'Your identity verification requires additional information. Please complete the verification process.',
          actionUrl: '/account/identity',
        });
      }
    });
  } catch (error) {
    console.error('Error handling identity verification update:', error);
    // Consider additional error handling or retry logic here
  }
}
