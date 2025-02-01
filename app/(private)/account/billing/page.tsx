import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { BillingPageClient } from "./billing-client";
import { getStripeConnectAccountStatus } from "@/lib/stripe";

export default async function BillingPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await db.query.UserTable.findFirst({
    where: eq(UserTable.clerkUserId, userId),
  });

  if (!dbUser) {
    redirect("/sign-in");
  }

  let accountStatus = null;
  if (dbUser.stripeConnectAccountId) {
    accountStatus = await getStripeConnectAccountStatus(
      dbUser.stripeConnectAccountId
    );
  }

  return (
    <BillingPageClient
      userId={userId}
      dbUser={dbUser}
      accountStatus={accountStatus}
    />
  );
}
