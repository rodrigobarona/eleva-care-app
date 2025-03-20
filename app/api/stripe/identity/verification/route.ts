import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { getServerStripe } from '@/lib/stripe';
import { createIdentityVerification, getIdentityVerificationStatus } from '@/lib/stripe/identity';
import { currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Rate limiting configuration
const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * POST /api/stripe/identity/verification
 *
 * Creates or retrieves a Stripe Identity verification session
 *
 * @returns 200 - Success with redirect URL or verification status
 * @returns 400 - Error from verification creation
 * @returns 401 - Unauthorized if no user is authenticated
 * @returns 404 - User not found in database
 * @returns 429 - Too Many Requests when rate limit is exceeded
 * @returns 500 - Server error during verification session creation
 */
export async function POST() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user record from database
    const dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const stripe = await getServerStripe();

    // Check if user already has an active verification session
    if (dbUser.stripeIdentityVerificationId) {
      console.log(
        `User ${dbUser.id} already has a verification session: ${dbUser.stripeIdentityVerificationId}`,
      );

      // Get the status of the existing verification
      try {
        const verificationStatus = await getIdentityVerificationStatus(
          dbUser.stripeIdentityVerificationId,
        );

        // If already verified, return success with the status
        if (verificationStatus.status === 'verified') {
          return NextResponse.json({
            success: true,
            status: verificationStatus.status,
            verificationId: dbUser.stripeIdentityVerificationId,
            redirectUrl: null,
            message: 'Identity already verified',
          });
        }

        // If session is in a usable state (requires_input or processing), return it
        if (['requires_input', 'processing'].includes(verificationStatus.status)) {
          console.log(
            `Returning existing verification session in status: ${verificationStatus.status}`,
          );

          // Retrieve the existing session with URL
          try {
            const existingSession = await stripe.identity.verificationSessions.retrieve(
              dbUser.stripeIdentityVerificationId,
            );

            if (existingSession.url) {
              return NextResponse.json({
                success: true,
                status: verificationStatus.status,
                verificationId: dbUser.stripeIdentityVerificationId,
                redirectUrl: existingSession.url,
                message: `Continuing existing verification in status: ${verificationStatus.status}`,
              });
            }
          } catch (error) {
            console.error(`Error retrieving existing verification session URL: ${error}`);
            // Fall through to create a new session
          }
        }

        // For other states (canceled, etc), create a new session
        console.log(
          `Existing verification session is in status ${verificationStatus.status}, creating a new one`,
        );
      } catch (error) {
        console.error(`Error checking existing verification status: ${error}`);
        // If there was an error retrieving the status, we'll create a new session
      }
    }

    // Implement rate limiting - check last verification check timestamp
    if (dbUser.stripeIdentityVerificationLastChecked) {
      const lastAttemptTime = new Date(dbUser.stripeIdentityVerificationLastChecked).getTime();
      const currentTime = Date.now();
      const timeSinceLastAttempt = currentTime - lastAttemptTime;

      if (timeSinceLastAttempt < RATE_LIMIT_COOLDOWN_MS) {
        const remainingCooldown = Math.ceil((RATE_LIMIT_COOLDOWN_MS - timeSinceLastAttempt) / 1000);
        console.log(
          `Rate limit exceeded for user ${dbUser.id}. Cooldown remaining: ${remainingCooldown}s`,
        );

        return NextResponse.json(
          {
            error: `Too many verification attempts. Please try again in ${remainingCooldown} seconds.`,
            cooldownRemaining: remainingCooldown,
          },
          { status: 429 },
        );
      }
    }

    // Update the verification last checked timestamp
    await db
      .update(UserTable)
      .set({
        stripeIdentityVerificationLastChecked: new Date(),
      })
      .where(eq(UserTable.id, dbUser.id));

    // Create a new verification session
    const result = await createIdentityVerification(
      dbUser.id,
      user.id,
      user.emailAddresses && user.emailAddresses.length > 0
        ? user.emailAddresses[0].emailAddress
        : dbUser.email,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating identity verification:', error);
    return NextResponse.json({ error: 'Failed to create identity verification' }, { status: 500 });
  }
}
