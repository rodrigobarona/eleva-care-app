import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { STRIPE_CONFIG } from "@/config/stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});

export async function verifyExpertConnectAccount(clerkUserId: string) {
  try {
    // Get the user's Stripe Connect account ID
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, clerkUserId),
    });

    if (!user?.stripeConnectAccountId) {
      console.error("No Stripe Connect account found for user:", {
        clerkUserId,
        email: user?.email,
      });
      return {
        error: true,
        code: "NO_CONNECT_ACCOUNT",
        message: "No Stripe Connect account found for this user",
      };
    }

    // Retrieve the Connect account from Stripe
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

    // Check if the account is fully set up
    const isFullySetup =
      account.details_submitted &&
      account.payouts_enabled &&
      account.capabilities?.transfers === "active";

    if (isFullySetup && !user.stripeConnectOnboardingComplete) {
      // Update the user record to mark onboarding as complete
      await db
        .update(UserTable)
        .set({
          stripeConnectOnboardingComplete: true,
        })
        .where(eq(UserTable.clerkUserId, clerkUserId));

      console.log("Updated Connect account status to complete:", {
        clerkUserId,
        email: user.email,
        accountId: user.stripeConnectAccountId,
      });
    }

    return {
      error: false,
      accountStatus: {
        detailsSubmitted: account.details_submitted,
        payoutsEnabled: account.payouts_enabled,
        transfersEnabled: account.capabilities?.transfers === "active",
        requiresRefresh: !isFullySetup,
        accountId: user.stripeConnectAccountId,
      },
    };
  } catch (error) {
    console.error("Error verifying Connect account:", {
      error: error instanceof Error ? error.message : "Unknown error",
      clerkUserId,
    });
    return {
      error: true,
      code: "VERIFICATION_ERROR",
      message: "Failed to verify Connect account status",
    };
  }
}

// Function to get expert's payout schedule
export async function getExpertPayoutSchedule(clerkUserId: string) {
  try {
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, clerkUserId),
    });

    if (!user?.stripeConnectAccountId) {
      return {
        error: true,
        code: "NO_CONNECT_ACCOUNT",
        message: "No Stripe Connect account found for this user",
      };
    }

    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

    return {
      error: false,
      schedule: {
        interval: account.settings?.payouts?.schedule?.interval,
        monthlyAnchor: account.settings?.payouts?.schedule?.monthly_anchor,
        weeklyAnchor: account.settings?.payouts?.schedule?.weekly_anchor,
        delay_days: account.settings?.payouts?.schedule?.delay_days,
      },
    };
  } catch (error) {
    console.error("Error getting payout schedule:", {
      error: error instanceof Error ? error.message : "Unknown error",
      clerkUserId,
    });
    return {
      error: true,
      code: "SCHEDULE_ERROR",
      message: "Failed to retrieve payout schedule",
    };
  }
}

export async function verifySpecificExpertAccount(email: string) {
  try {
    // Get the user by email
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.email, email),
    });

    if (!user) {
      console.error("User not found:", { email });
      return {
        error: true,
        code: "USER_NOT_FOUND",
        message: "User not found",
      };
    }

    return verifyExpertConnectAccount(user.clerkUserId);
  } catch (error) {
    console.error("Error verifying specific expert account:", {
      error: error instanceof Error ? error.message : "Unknown error",
      email,
    });
    return {
      error: true,
      code: "VERIFICATION_ERROR",
      message: "Failed to verify expert account",
    };
  }
}

// Function to verify and update specific expert's account
export async function verifyAndUpdateSpecificExpert(email: string) {
  try {
    const result = await verifySpecificExpertAccount(email);

    if (result.error || !result.accountStatus?.accountId) {
      return result;
    }

    // Get payout schedule
    const scheduleResult = await getExpertPayoutSchedule(
      result.accountStatus.accountId
    );

    return {
      ...result,
      payoutSchedule: scheduleResult.error ? null : scheduleResult.schedule,
    };
  } catch (error) {
    console.error("Error in verifyAndUpdateSpecificExpert:", {
      error: error instanceof Error ? error.message : "Unknown error",
      email,
    });
    return {
      error: true,
      code: "UPDATE_ERROR",
      message: "Failed to verify and update expert account",
    };
  }
}
