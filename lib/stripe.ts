import Stripe from "stripe";
import { STRIPE_CONFIG } from "@/config/stripe";
import { Redis } from "@upstash/redis";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});

// Initialize Redis with correct environment variables
const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? "",
  token: process.env.KV_REST_API_TOKEN ?? "",
});

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

    // Verify Redis connection
    const isRedisConnected = await verifyRedisConnection();
    if (!isRedisConnected) {
      console.warn("Redis connection failed, proceeding with Stripe-only flow");
    }

    // Create new customer for each unique email
    console.log("Creating new Stripe customer:", { email, userId });
    const newCustomer = await stripe.customers.create({
      email: email.toLowerCase(),
      metadata: {
        ...(userId ? { userId } : {}),
        isGuest: userId ? "false" : "true",
        createdAt: new Date().toISOString(),
      },
    });

    // Try to sync to KV if Redis is connected
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
