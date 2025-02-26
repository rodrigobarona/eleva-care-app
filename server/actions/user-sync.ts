import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { getOrCreateStripeCustomer, syncStripeDataToKV } from '@/lib/stripe';
import { createClerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

/**
 * Service to handle all user synchronization between Clerk, database, and Stripe
 * This ensures consistency across all systems
 */

/**
 * Get a user by their Clerk user ID from the database
 */
export async function getUserByClerkId(clerkUserId: string) {
  return db.query.UserTable.findFirst({
    where: eq(UserTable.clerkUserId, clerkUserId),
  });
}

/**
 * Get a user from Clerk by their ID
 */
export async function getUserFromClerk(clerkUserId: string) {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  return clerk.users.getUser(clerkUserId);
}

/**
 * Creates a user in the database based on Clerk user data
 */
export async function createUserFromClerk(clerkUserId: string) {
  const clerkUser = await getUserFromClerk(clerkUserId);

  if (!clerkUser) {
    throw new Error(`No Clerk user found with ID: ${clerkUserId}`);
  }

  // Get primary email
  const primaryEmailObject = clerkUser.emailAddresses.find(
    (email) => email.id === clerkUser.primaryEmailAddressId,
  );

  if (!primaryEmailObject) {
    throw new Error(`No primary email found for Clerk user: ${clerkUserId}`);
  }

  const email = primaryEmailObject.emailAddress;

  // Get name
  const firstName = clerkUser.firstName;
  const lastName = clerkUser.lastName;

  // Insert the user
  const [newUser] = await db
    .insert(UserTable)
    .values({
      clerkUserId,
      email,
      firstName,
      lastName,
      imageUrl: clerkUser.imageUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  console.log('Created new user in database from Clerk:', {
    id: newUser.id,
    clerkUserId,
    email,
  });

  return newUser;
}

/**
 * Get user data from the database or create if it doesn't exist
 */
export async function getOrCreateUserByClerkId(clerkUserId: string) {
  let user = await getUserByClerkId(clerkUserId);

  if (!user) {
    console.log('User not found in database, creating from Clerk:', clerkUserId);
    user = await createUserFromClerk(clerkUserId);
  }

  return user;
}

/**
 * Ensure user has a Stripe customer ID and it's properly synced
 */
export async function ensureUserStripeCustomer(user: typeof UserTable.$inferSelect) {
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

  const customerId = await getOrCreateStripeCustomer(user.id, user.email);

  // Update the user record with the customer ID
  await db
    .update(UserTable)
    .set({
      stripeCustomerId: customerId,
      updatedAt: new Date(),
    })
    .where(eq(UserTable.id, user.id));

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
export async function ensureFullUserSynchronization(clerkUserId: string) {
  // Step 1: Get the user from our database or create if needed
  const dbUser = await getOrCreateUserByClerkId(clerkUserId);
  if (!dbUser) {
    console.error('Failed to get or create user in database:', clerkUserId);
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
            .update(UserTable)
            .set({
              stripeCustomerId: newCustomerId,
              updatedAt: new Date(),
            })
            .where(eq(UserTable.id, dbUser.id));

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
            .update(UserTable)
            .set({
              stripeCustomerId: newCustomerId,
              updatedAt: new Date(),
            })
            .where(eq(UserTable.id, dbUser.id));

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
