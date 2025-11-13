import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema-workos';
import { getOrCreateStripeCustomer, syncStripeDataToKV } from '@/lib/integrations/stripe';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

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

/**
 * Get a user by their WorkOS user ID from the database
 */
export async function getUserByWorkOsId(workosUserId: string) {
  return db.query.UsersTable.findFirst({
    where: eq(UsersTable.workosUserId, workosUserId),
  });
}

/**
 * Ensure user has a Stripe customer ID and it's properly synced
 */
export async function ensureUserStripeCustomer(user: typeof UsersTable.$inferSelect) {
  // Already has a Stripe customer ID
  if (user.stripeCustomerId) {
    console.log('User already has Stripe customer ID:', user.stripeCustomerId);
    // Make sure it's synced to Redis
    await syncStripeDataToKV(user.stripeCustomerId);
    return user.stripeCustomerId;
  }

  // Create a new Stripe customer or find existing
  console.log('Creating or fetching Stripe customer for user:', {
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

  console.log('Updated user with Stripe customer ID:', {
    userId: user.id,
    customerId,
  });

  return customerId;
}

/**
 * Update Stripe customer email to match user email
 */
export async function updateStripeCustomerEmail(customerId: string, email: string) {
  try {
    // Get Stripe instance
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');

    // Check if the customer exists and has the right email
    const customer = await stripe.customers.retrieve(customerId);

    if ('deleted' in customer && customer.deleted) {
      console.error('Tried to update deleted customer:', customerId);
      return null;
    }

    // Email already matches
    if (customer.email === email) {
      return customer;
    }

    // Update the email
    console.log('Updating Stripe customer email:', {
      customerId,
      oldEmail: customer.email,
      newEmail: email,
    });

    const updatedCustomer = await stripe.customers.update(customerId, {
      email,
    });

    return updatedCustomer;
  } catch (error) {
    console.error('Error updating Stripe customer email:', error);
    return null;
  }
}

/**
 * Main function to ensure user is fully synchronized across all systems
 * Call this function at critical points in the application
 */
export async function ensureFullUserSynchronization(workosUserId: string) {
  // Step 1: Get the user from our database
  const dbUser = await getUserByWorkOsId(workosUserId);
  if (!dbUser) {
    console.error('User not found in database:', workosUserId);
    return null;
  }

  // Step 2: Ensure user has a valid Stripe customer ID
  if (dbUser.stripeCustomerId) {
    console.log('User already has Stripe customer ID:', dbUser.stripeCustomerId);

    // Check if the customer still exists in Stripe
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');
      const customer = await stripe.customers.retrieve(dbUser.stripeCustomerId);

      if ('deleted' in customer && customer.deleted) {
        console.log('Customer was deleted, creating a new one');
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

          // Update our local copy of the user
          dbUser.stripeCustomerId = newCustomerId;
        }
      } else if (dbUser.email) {
        // Customer exists, make sure email is up to date
        await updateStripeCustomerEmail(dbUser.stripeCustomerId, dbUser.email);
      }
    } catch (error) {
      // If we can't retrieve the customer, it's likely deleted or invalid
      console.error('Error retrieving Stripe customer:', error);

      // Create a new customer
      if (dbUser.email) {
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

          // Update our local copy of the user
          dbUser.stripeCustomerId = newCustomerId;
        }
      }
    }
  } else if (dbUser.email) {
    // No customer ID yet, create one
    const customerId = await ensureUserStripeCustomer(dbUser);
    if (customerId) {
      dbUser.stripeCustomerId = customerId;
    }
  }

  // Return the fully synchronized user
  return dbUser;
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
  try {
    // Import here to avoid circular dependencies
    const { getWorkOSUserById, syncUserProfileData } = await import(
      '@/lib/integrations/workos/sync'
    );

    console.log(`🔄 Syncing profile data from WorkOS: ${workosUserId}`);

    // Fetch user from WorkOS (source of truth)
    const workosUser = await getWorkOSUserById(workosUserId);

    if (!workosUser) {
      console.error(`❌ User not found in WorkOS: ${workosUserId}`);
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

    console.log(`✅ Profile data synced for: ${workosUser.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error syncing profile data:`, error);
    return false;
  }
}
