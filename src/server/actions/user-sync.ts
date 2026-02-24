'use server';

import { db, invalidateCache } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema';
import {
  getOrCreateStripeCustomer,
  getServerStripe,
  syncStripeDataToKV,
} from '@/lib/integrations/stripe';
import * as Sentry from '@sentry/nextjs';
import { eq } from 'drizzle-orm';

const { logger } = Sentry;

/**
 * Service to handle all user synchronization between WorkOS, database, and Stripe
 * This ensures consistency across all systems
 *
 * Sync Strategy:
 * - WorkOS is the source of truth for user authentication data
 * - Database caches user data for performance and relationships
 * - Profile data (firstName/lastName) synced from WorkOS immediately after auth
 * - Stripe customer created lazily when needed
 */

import { getFullUserByWorkosId } from '@/server/db/users';

/**
 * @deprecated Use `getFullUserByWorkosId` from `@/server/db/users` instead.
 */
export async function getUserByWorkOsId(workosUserId: string) {
  return getFullUserByWorkosId(workosUserId);
}

/**
 * Ensure user has a Stripe customer ID and it's properly synced
 */
export async function ensureUserStripeCustomer(user: typeof UsersTable.$inferSelect) {
  return Sentry.withServerActionInstrumentation('ensureUserStripeCustomer', { recordResponse: true }, async () => {
  // Already has a Stripe customer ID
  if (user.stripeCustomerId) {
    logger.info('User already has Stripe customer ID', { stripeCustomerId: user.stripeCustomerId });
    // Make sure it's synced to Redis
    await syncStripeDataToKV(user.stripeCustomerId);
    return user.stripeCustomerId;
  }

  // Create a new Stripe customer or find existing
  logger.info('Creating or fetching Stripe customer for user', {
    userId: user.id,
    email: user.email,
  });

  // Note: Name is stored in ProfilesTable, not UsersTable
  // If you need to pass name to Stripe, fetch it from ProfilesTable or WorkOS User API
  const customerId = await getOrCreateStripeCustomer(user.id, user.email, undefined);

  // Update the user record with the customer ID
  await db
    .update(UsersTable)
    .set({
      stripeCustomerId: customerId,
      updatedAt: new Date(),
    })
    .where(eq(UsersTable.id, user.id));

  const workosUserId = user.workosUserId;
  if (workosUserId) {
    await invalidateCache([`user-${workosUserId}`, `user-full-${workosUserId}`]);
  }

  logger.info('Updated user with Stripe customer ID', {
    userId: user.id,
    customerId,
  });

  return customerId;
  });
}

/**
 * Update Stripe customer email to match user email
 */
export async function updateStripeCustomerEmail(customerId: string, email: string) {
  return Sentry.withServerActionInstrumentation('updateStripeCustomerEmail', { recordResponse: true }, async () => {
  try {
    const stripe = await getServerStripe();

    // Check if the customer exists and has the right email
    const customer = await stripe.customers.retrieve(customerId);

    if ('deleted' in customer && customer.deleted) {
      logger.error('Tried to update deleted customer', { customerId });
      return null;
    }

    // Email already matches
    if (customer.email === email) {
      return customer;
    }

    // Update the email
    logger.info('Updating Stripe customer email', {
      customerId,
      oldEmail: customer.email,
      newEmail: email,
    });

    const updatedCustomer = await stripe.customers.update(customerId, {
      email,
    });

    return updatedCustomer;
  } catch (error) {
    logger.error('Error updating Stripe customer email', { error });
    return null;
  }
  });
}

/**
 * Main function to ensure user is fully synchronized across all systems
 * Call this function at critical points in the application
 */
export async function ensureFullUserSynchronization(workosUserId: string) {
  return Sentry.withServerActionInstrumentation('ensureFullUserSynchronization', { recordResponse: true }, async () => {
  // Step 1: Get the user from our database
  const dbUser = await getFullUserByWorkosId(workosUserId);
  if (!dbUser) {
    logger.error('User not found in database', { workosUserId });
    return null;
  }

  // Step 2: Ensure user has a valid Stripe customer ID
  if (dbUser.stripeCustomerId) {
    logger.info('User already has Stripe customer ID', { stripeCustomerId: dbUser.stripeCustomerId });

    // Check if the customer still exists in Stripe
    try {
      const stripe = await getServerStripe();
      const customer = await stripe.customers.retrieve(dbUser.stripeCustomerId);

      if ('deleted' in customer && customer.deleted) {
        logger.info('Customer was deleted, creating a new one');
        // Customer was deleted, create a new one
        const newCustomerId = await ensureUserStripeCustomer({
          ...dbUser,
          stripeCustomerId: null, // Force creation of a new customer
        });

        if (newCustomerId) {
          // Update the user record with the new customer ID
          await db
            .update(UsersTable)
            .set({
              stripeCustomerId: newCustomerId,
              updatedAt: new Date(),
            })
            .where(eq(UsersTable.id, dbUser.id));

          await invalidateCache([`user-${workosUserId}`, `user-full-${workosUserId}`]);

          // Update our local copy of the user
          dbUser.stripeCustomerId = newCustomerId;
        }
      } else {
        if (dbUser.email) {
          await updateStripeCustomerEmail(dbUser.stripeCustomerId, dbUser.email);
        }
        await syncStripeDataToKV(dbUser.stripeCustomerId);
      }
    } catch (error) {
      logger.error('Error retrieving Stripe customer', { error });

      if (dbUser.email) {
        const newCustomerId = await ensureUserStripeCustomer({
          ...dbUser,
          stripeCustomerId: null,
        });

        if (newCustomerId) {
          await db
            .update(UsersTable)
            .set({
              stripeCustomerId: newCustomerId,
              updatedAt: new Date(),
            })
            .where(eq(UsersTable.id, dbUser.id));

          await invalidateCache([`user-${workosUserId}`, `user-full-${workosUserId}`]);

          dbUser.stripeCustomerId = newCustomerId;
        }
      }
    }
  } else if (dbUser.email) {
    const customerId = await ensureUserStripeCustomer(dbUser);
    if (customerId) {
      dbUser.stripeCustomerId = customerId;
    }
  }

  // Return the fully synchronized user
  return dbUser;
  });
}

/**
 * Sync WorkOS profile data to ProfilesTable
 *
 * This function ensures profile data (firstName/lastName) is populated
 * immediately after authentication, improving UX.
 *
 * @param workosUserId - WorkOS user ID
 * @returns Success status
 *
 * @example
 * ```typescript
 * // Call after user authentication
 * await syncWorkOSProfileToDatabase('user_01H...');
 * ```
 */
export async function syncWorkOSProfileToDatabase(workosUserId: string): Promise<boolean> {
  return Sentry.withServerActionInstrumentation('syncWorkOSProfileToDatabase', { recordResponse: true }, async () => {
  try {
    // Import here to avoid circular dependencies
    const { getWorkOSUserById, syncUserProfileData } = await import(
      '@/lib/integrations/workos/sync'
    );

    logger.info(`🔄 Syncing profile data from WorkOS: ${workosUserId}`);

    // Fetch user from WorkOS (source of truth)
    const workosUser = await getWorkOSUserById(workosUserId);

    if (!workosUser) {
      logger.error(`❌ User not found in WorkOS: ${workosUserId}`);
      return false;
    }

    // Sync profile data
    await syncUserProfileData({
      id: workosUser.id,
      email: workosUser.email,
      firstName: workosUser.firstName,
      lastName: workosUser.lastName,
      emailVerified: workosUser.emailVerified,
      profilePictureUrl: workosUser.profilePictureUrl,
    });

    logger.info(`✅ Profile data synced for: ${workosUser.email}`);
    return true;
  } catch (error) {
    logger.error('❌ Error syncing profile data', { error });
    return false;
  }
  });
}
