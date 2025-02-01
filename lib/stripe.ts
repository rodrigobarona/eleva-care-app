import Stripe from "stripe";
import { STRIPE_CONFIG } from "@/config/stripe";
import { Redis } from "@upstash/redis";
import { db } from "@/drizzle/db";
import { UserTable, EventTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});

// Initialize Redis with correct environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? "",
  token: process.env.KV_REST_API_TOKEN ?? "",
});

// Platform fee percentage for revenue sharing
// This fee is automatically handled by Stripe Connect and can be monitored
// in the Stripe Connect dashboard (https://dashboard.stripe.com/connect)
const PLATFORM_FEE_PERCENTAGE = Number(
  process.env.STRIPE_PLATFORM_FEE_PERCENTAGE ?? "0.15"
); // Default 15% if not set

interface StripeCustomerData {
  stripeCustomerId: string;
  email: string;
  userId?: string;
  createdAt: number;
  updatedAt: number;
}

export async function getServerStripe() {
  return stripe;
}

// Add detailed Redis connection verification
async function verifyRedisConnection() {
  try {
    // Test both read and write operations
    const testKey = "stripe:connection:test";
    const testValue = `test-${Date.now()}`;

    // Test write
    const writeResult = await redis.set(testKey, testValue);
    console.log("Redis write test result:", writeResult);

    // Test read
    const readResult = await redis.get(testKey);
    console.log("Redis read test result:", readResult);

    // Cleanup
    await redis.del(testKey);

    const success = writeResult === "OK" && readResult === testValue;
    if (!success) {
      console.error("Redis connection test failed:", {
        writeResult,
        readResult,
      });
      return false;
    }

    console.log("Redis connection verified successfully");
    return true;
  } catch (error) {
    console.error("Redis connection verification failed:", error);
    return false;
  }
}

export async function syncStripeDataToKV(stripeCustomerId: string) {
  try {
    // Verify Redis connection first with detailed logging
    console.log("Verifying Redis connection before sync...");
    const isRedisConnected = await verifyRedisConnection();
    if (!isRedisConnected) {
      console.error("Redis connection verification failed, aborting sync");
      throw new Error("Redis connection failed");
    }
    console.log("Redis connection verified, proceeding with sync");

    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (!customer || customer.deleted) {
      throw new Error("Customer was deleted or not found");
    }

    const customerData: StripeCustomerData = {
      stripeCustomerId: customer.id,
      email: typeof customer.email === "string" ? customer.email : "",
      userId:
        typeof customer.metadata?.userId === "string"
          ? customer.metadata.userId
          : undefined,
      createdAt: customer.created,
      updatedAt: Date.now(),
    };

    console.log("Preparing to store customer data:", customerData);

    // Store in Redis with multiple access patterns
    const storeOperations = [
      // Store by Stripe customer ID
      redis
        .set(`stripe:customer:id:${customer.id}`, JSON.stringify(customerData))
        .then((result) => {
          console.log(`Store by ID result: ${result}`);
          return result;
        }),
      // Store by email
      redis
        .set(
          `stripe:customer:email:${customerData.email.toLowerCase()}`,
          JSON.stringify(customerData)
        )
        .then((result) => {
          console.log(`Store by email result: ${result}`);
          return result;
        }),
    ];

    // If there's a userId, add that storage operation
    if (customerData.userId) {
      storeOperations.push(
        redis
          .set(
            `stripe:customer:user:${customerData.userId}`,
            JSON.stringify(customerData)
          )
          .then((result) => {
            console.log(`Store by userId result: ${result}`);
            return result;
          })
      );
    }

    // Execute all storage operations and verify they succeeded
    console.log("Executing storage operations...");
    const results = await Promise.all(storeOperations);
    console.log("Storage operation results:", results);

    const allSucceeded = results.every((result) => result === "OK");
    if (!allSucceeded) {
      console.error("Some Redis operations failed:", results);
      throw new Error("Failed to store customer data in Redis");
    }

    console.log("Successfully synced customer data to KV:", {
      customerId: customer.id,
      email: customerData.email,
      userId: customerData.userId,
      results,
    });

    return customerData;
  } catch (error) {
    console.error("Error syncing Stripe data to KV:", error);
    throw error;
  }
}

export async function getOrCreateStripeCustomer(
  userId?: string,
  email?: string
): Promise<string> {
  try {
    if (!email) {
      throw new Error("Email is required");
    }

    const normalizedEmail = email.toLowerCase();

    // First check if customer exists in Stripe
    console.log("Checking for existing customer with email:", normalizedEmail);
    const existingCustomers = await stripe.customers.list({
      email: normalizedEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      const existingCustomer = existingCustomers.data[0];
      console.log("Found existing customer:", existingCustomer.id);

      // Update customer metadata if needed
      if (userId && !existingCustomer.metadata?.userId) {
        await stripe.customers.update(existingCustomer.id, {
          metadata: {
            ...existingCustomer.metadata,
            userId,
            isGuest: userId ? "false" : "true",
            updatedAt: new Date().toISOString(),
          },
        });
      }

      // Try to sync to KV if Redis is connected
      const isRedisConnected = await verifyRedisConnection();
      if (isRedisConnected) {
        await syncStripeDataToKV(existingCustomer.id).catch((error) => {
          console.error("Failed to sync existing customer to KV:", error);
        });
      }

      return existingCustomer.id;
    }

    // If no customer exists, create a new one
    console.log("Creating new customer for email:", normalizedEmail);
    const newCustomer = await stripe.customers.create({
      email: normalizedEmail,
      metadata: {
        ...(userId ? { userId } : {}),
        isGuest: userId ? "false" : "true",
        createdAt: new Date().toISOString(),
      },
    });

    // Try to sync to KV if Redis is connected
    const isRedisConnected = await verifyRedisConnection();
    if (isRedisConnected) {
      await syncStripeDataToKV(newCustomer.id).catch((error) => {
        console.error("Failed to sync new customer to KV:", error);
      });
    }

    return newCustomer.id;
  } catch (error) {
    console.error("Error in getOrCreateStripeCustomer:", error);
    throw error;
  }
}

export async function createPaymentIntent({
  eventId,
  customerEmail,
  meetingData,
}: {
  eventId: string;
  customerEmail: string;
  meetingData: Record<string, unknown>;
}) {
  try {
    // Get event details
    const event = await db.query.EventTable.findFirst({
      where: eq(EventTable.id, eventId),
    });

    if (!event) {
      throw new Error("Event not found");
    }

    // Get expert's Stripe Connect account
    const expert = await db.query.UserTable.findFirst({
      where: eq(UserTable.id, event.clerkUserId),
    });

    if (
      !expert?.stripeConnectAccountId ||
      !expert.stripeConnectOnboardingComplete
    ) {
      throw new Error("Expert's Stripe account not found or setup incomplete");
    }

    // Calculate application fee
    const amount = event.price;
    const applicationFeeAmount = Math.round(amount * PLATFORM_FEE_PERCENTAGE);

    // Create or get customer
    const customer = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    const customerId =
      customer.data.length > 0
        ? customer.data[0].id
        : (
            await stripe.customers.create({
              email: customerEmail,
              metadata: {
                eventId,
              },
            })
          ).id;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        eventId,
        meetingData: JSON.stringify(meetingData),
      },
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: expert.stripeConnectAccountId,
      },
    });

    return { clientSecret: paymentIntent.client_secret };
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw error;
  }
}

export async function createStripeConnectAccount(userId: string) {
  try {
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.id, userId),
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Create a Connect account
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      metadata: {
        userId,
      },
    });

    // Update user with Connect account ID
    await db
      .update(UserTable)
      .set({
        stripeConnectAccountId: account.id,
        updatedAt: new Date(),
      })
      .where(eq(UserTable.id, userId));

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/billing?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/billing?success=true`,
      type: "account_onboarding",
    });

    return { url: accountLink.url };
  } catch (error) {
    console.error("Error creating Connect account:", error);
    throw error;
  }
}

export async function getStripeConnectAccountStatus(accountId: string) {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return {
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    };
  } catch (error) {
    console.error("Error retrieving Connect account status:", error);
    throw error;
  }
}
