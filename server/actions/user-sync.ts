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
  // Get Stripe instance
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');

  // Check if the customer exists and has the right email
  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) {
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

  // Re-sync to KV
  await syncStripeDataToKV(customerId);

  return updatedCustomer;
}

/**
 * Main function to ensure user is fully synchronized across all systems
 * Call this function at critical points in the application
 */
export async function ensureFullUserSynchronization(clerkUserId: string) {
  // Step 1: Get or create the user in our database
  const user = await getOrCreateUserByClerkId(clerkUserId);

  // Step 2: Ensure they have a Stripe customer and it's synchronized
  const customerId = await ensureUserStripeCustomer(user);

  // Step 3: Make sure Stripe customer email matches our user email
  await updateStripeCustomerEmail(customerId, user.email);

  // Step 4: Return the fully synced user data
  return {
    ...user,
    stripeCustomerId: customerId,
  };
}
