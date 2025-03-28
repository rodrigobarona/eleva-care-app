import { STRIPE_CONNECT_SUPPORTED_COUNTRIES } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

import { getBaseUrl, getServerStripe } from '../stripe';

/**
 * Creates a Stripe Identity verification session
 * This is the first step in the expert verification process
 *
 * Side effects:
 * - Updates the user record in the database with verification session ID and status
 * - Sets stripeIdentityVerificationLastChecked to current timestamp
 *
 * @param userId - Database user ID
 * @param clerkUserId - Clerk user ID for authentication
 * @param email - User's email address
 * @returns Response object with success status and session details or error information
 */
export async function createIdentityVerification(
  userId: string,
  clerkUserId: string,
  email: string,
): Promise<
  | {
      success: true;
      status: string;
      verificationId: string;
      redirectUrl: string | null;
      message: string;
    }
  | {
      success: false;
      error: string;
    }
> {
  const stripe = await getServerStripe();
  const baseUrl = getBaseUrl();

  try {
    // Check if user already has an active verification
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, clerkUserId),
    });

    if (user?.stripeIdentityVerificationId) {
      // Check the status of the existing verification
      const verificationStatus = await getIdentityVerificationStatus(
        user.stripeIdentityVerificationId,
      );

      if (verificationStatus.status === 'verified') {
        return {
          success: true,
          status: verificationStatus.status,
          verificationId: user.stripeIdentityVerificationId,
          redirectUrl: null,
          message: 'Identity already verified',
        };
      }
    }

    // Create a new verification session
    // Note: Additional verification types like 'id_document_and_selfie' are available
    // for stronger verification if required by compliance needs
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        userId,
        clerkUserId,
        email,
        created_at: new Date().toISOString(),
      },
      return_url: `${baseUrl}/account/identity/callback`,
    });

    // Store the verification session ID in the database
    await db
      .update(UserTable)
      .set({
        stripeIdentityVerificationId: verificationSession.id,
        stripeIdentityVerificationStatus: verificationSession.status,
        stripeIdentityVerificationLastChecked: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(UserTable.clerkUserId, clerkUserId));

    return {
      success: true,
      status: verificationSession.status,
      verificationId: verificationSession.id,
      redirectUrl: verificationSession.url,
      message: 'Identity verification created successfully',
    };
  } catch (error) {
    // Log error with masked sensitive details in production
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error creating identity verification:', maskSensitiveData(errorMessage));

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Gets the status of a Stripe Identity verification session
 *
 * @param verificationId - Stripe verification session ID
 * @returns Object containing status information, timestamp, and error details if any
 */
export async function getIdentityVerificationStatus(verificationId: string): Promise<{
  status: string;
  lastUpdated: string | undefined;
  details?: string;
  errorCode?: string;
}> {
  const stripe = await getServerStripe();

  try {
    const verificationSession = await stripe.identity.verificationSessions.retrieve(verificationId);

    // We access the status directly since it's part of the standard API
    const status = verificationSession.status;

    // For timestamps and other properties that might not be properly typed,
    // we use a more specific type definition
    let lastUpdated: string | undefined = undefined;

    // Define more specific types for stripe object properties
    type StripeTimestamp = number;
    interface StripeError {
      message?: string;
      code?: string;
    }

    // Type cast for accessing properties safely
    const stripeSession = verificationSession as Stripe.Identity.VerificationSession & {
      created: StripeTimestamp;
      last_error?: StripeError;
    };

    // Get timestamp
    if (stripeSession.created) {
      lastUpdated = new Date(stripeSession.created * 1000).toISOString();
    }

    return {
      status,
      lastUpdated,
      details: stripeSession.last_error?.message,
      errorCode: stripeSession.last_error?.code,
    };
  } catch (error) {
    console.error('Error retrieving verification status:', maskSensitiveData(error));
    throw error;
  }
}

/**
 * Helper function to create a Stripe account link for onboarding
 * Extracted to make the retry mechanism cleaner
 */
async function createAccountLink(
  stripe: Stripe,
  accountId: string,
  baseUrl: string,
): Promise<Stripe.AccountLink> {
  return await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/account/billing?refresh=true`,
    return_url: `${baseUrl}/account/billing?success=true`,
    type: 'account_onboarding',
    collect: 'eventually_due',
  });
}

/**
 * Creates a Connect account using verified identity information
 * This should be called after identity verification is complete
 *
 * Side effects:
 * - Creates a Stripe Connect account if one doesn't exist
 * - Updates the user record in the database with Connect account ID and status
 *
 * @param clerkUserId - Clerk user ID for authentication
 * @param email - User's email address
 * @param country - Two-letter country code
 * @returns Response object with success status and account details or error information
 */
export async function createConnectAccountWithVerifiedIdentity(
  clerkUserId: string,
  email: string,
  country: string,
): Promise<
  | {
      success: true;
      accountId: string;
      detailsSubmitted: boolean;
      onboardingUrl: string;
    }
  | {
      success: false;
      error: string;
    }
> {
  const stripe = await getServerStripe();
  const baseUrl = getBaseUrl();

  // Validate country code against supported Stripe Connect countries
  const validCountryCodes = STRIPE_CONNECT_SUPPORTED_COUNTRIES;

  const countryCode = country.toUpperCase();
  // Type assertion to make TypeScript happy with the readonly array
  if (!(validCountryCodes as readonly string[]).includes(countryCode)) {
    logError('Invalid country code', { clerkUserId, email, country });
    return {
      success: false,
      error: `Invalid country code: ${country}. Must be one of: ${validCountryCodes.join(', ')}`,
    };
  }

  try {
    // Get the user from the database
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, clerkUserId),
    });

    if (!user) {
      logError('User not found', { clerkUserId, email });
      throw new Error('User not found');
    }

    // Check if the user has a verified identity
    if (!user.stripeIdentityVerificationId) {
      logError('User has not completed identity verification', { clerkUserId, userId: user.id });
      throw new Error('User has not completed identity verification');
    }

    // Get verification status
    const verificationStatus = await getIdentityVerificationStatus(
      user.stripeIdentityVerificationId,
    );

    if (verificationStatus.status !== 'verified') {
      logError('Identity verification is not complete', {
        clerkUserId,
        userId: user.id,
        status: verificationStatus.status,
      });
      throw new Error(`Identity verification is not complete: ${verificationStatus.status}`);
    }

    // Step 1: Check if account already exists to avoid duplication
    if (user.stripeConnectAccountId) {
      // Get account details from Stripe to verify it's valid
      try {
        const existingAccount = await stripe.accounts.retrieve(user.stripeConnectAccountId);

        // If account exists and is active, create a new account link
        if (existingAccount.id) {
          const accountLink = await stripe.accountLinks.create({
            account: existingAccount.id,
            refresh_url: `${baseUrl}/account/billing?refresh=true`,
            return_url: `${baseUrl}/account/billing?success=true`,
            type: 'account_onboarding',
            collect: 'eventually_due',
          });

          return {
            success: true,
            accountId: existingAccount.id,
            detailsSubmitted: existingAccount.details_submitted,
            onboardingUrl: accountLink.url,
          };
        }
      } catch (error: unknown) {
        // If the existing account ID is invalid, we'll create a new one
        logError('Existing Connect account not found in Stripe', {
          clerkUserId,
          accountId: user.stripeConnectAccountId,
          error,
        });
      }
    }

    // Step 2: Create the Connect account using the verified identity
    let account: Stripe.Account;
    try {
      account = await stripe.accounts.create({
        type: 'express',
        country: countryCode,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        settings: {
          payouts: {
            schedule: {
              interval: 'daily',
              delay_days: 0,
            },
          },
        },
        metadata: {
          clerkUserId,
          identity_verified: 'true',
          identity_verified_at: new Date().toISOString(),
          identity_verification_id: user.stripeIdentityVerificationId,
        },
      });
    } catch (error) {
      logError('Failed to create Stripe Connect account', { clerkUserId, email, country, error });
      throw error;
    }

    // Step 3: Update the user record with the Connect account ID
    try {
      await db
        .update(UserTable)
        .set({
          stripeConnectAccountId: account.id,
          stripeConnectDetailsSubmitted: account.details_submitted,
          stripeConnectPayoutsEnabled: account.payouts_enabled,
          stripeConnectChargesEnabled: account.charges_enabled,
          updatedAt: new Date(),
        })
        .where(eq(UserTable.clerkUserId, clerkUserId));
    } catch (dbError) {
      // If database update fails, we should delete the Stripe account to maintain consistency
      logError('Failed to update user record with Connect account', {
        clerkUserId,
        accountId: account.id,
        error: dbError,
      });

      try {
        // Attempt to delete the created account to avoid orphaned accounts
        await stripe.accounts.del(account.id);
      } catch (deleteError) {
        logError('Failed to delete orphaned Connect account after DB update failure', {
          clerkUserId,
          accountId: account.id,
          error: deleteError,
        });
      }

      throw dbError;
    }

    // Step 4: Create account link for onboarding
    let accountLink: Stripe.AccountLink;
    try {
      accountLink = await createAccountLink(stripe, account.id, baseUrl);
    } catch (linkError: unknown) {
      logError('Failed to create account link for onboarding', {
        clerkUserId,
        accountId: account.id,
        error: linkError,
      });

      // Implement a simple retry mechanism
      try {
        // Wait a moment before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
        logError('Retrying account link creation after failure', {
          clerkUserId,
          accountId: account.id,
        });

        accountLink = await createAccountLink(stripe, account.id, baseUrl);

        // If we reach here, retry succeeded
        return {
          success: true,
          accountId: account.id,
          detailsSubmitted: account.details_submitted,
          onboardingUrl: accountLink.url,
        };
      } catch (retryError) {
        logError('Failed to create account link after retry', {
          clerkUserId,
          accountId: account.id,
          error: retryError,
        });
        // We don't delete the account here since it was successfully created and saved to DB
        // The user can try again later to get an onboarding link
        throw linkError;
      }
    }

    return {
      success: true,
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      onboardingUrl: accountLink.url,
    };
  } catch (error) {
    logError('Error creating Connect account with verified identity', {
      clerkUserId,
      email,
      country,
      error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Central logging function for Stripe operations
 * This can be replaced with your preferred logging solution
 */
function logError(message: string, context: Record<string, unknown>): void {
  // Mask sensitive data in context before logging
  const maskedContext = maskSensitiveData(context);

  // Log to console for now, but could be replaced with a more sophisticated logging solution
  console.error(`[STRIPE ERROR] ${message}:`, maskedContext);

  // TODO: Integrate with monitoring services like Sentry, DataDog, etc.
  // if (process.env.NODE_ENV === 'production') {
  //   // Example: Sentry.captureException(new Error(message), { extra: context });
  // }
}

/**
 * Masks potentially sensitive data in error objects and log contexts
 * to prevent leaking PII in logs
 */
function maskSensitiveData(data: unknown): unknown {
  if (typeof data === 'string') {
    // Mask potential sensitive patterns in strings
    return data
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL_REDACTED]')
      .replace(/\b(?:\d[ -]*?){13,16}\b/g, '[CARD_REDACTED]') // Credit card patterns
      .replace(/sk_(?:test|live)_[a-zA-Z0-9]{24,}/g, '[STRIPE_KEY_REDACTED]');
  }

  if (data instanceof Error) {
    const { message, name } = data;
    return { name, message: maskSensitiveData(message), stack: '[STACK_TRACE_REDACTED]' };
  }

  if (typeof data === 'object' && data !== null) {
    const result: Record<string, unknown> = {};

    // Handle array case
    if (Array.isArray(data)) {
      return data.map(maskSensitiveData);
    }

    // Handle object case
    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive fields entirely
      if (['password', 'secret', 'token', 'key', 'ssn', 'tax_id'].includes(key.toLowerCase())) {
        result[key] = '[REDACTED]';
        continue;
      }

      // Recursively mask nested objects
      result[key] = maskSensitiveData(value);
    }

    return result;
  }

  return data;
}
