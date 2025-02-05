"use client";

import React from "react";
import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { BillingPageClient } from "./billing-client";

interface DbUser {
  id: string;
  clerkUserId: string;
  stripeConnectAccountId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  role: string;
}

interface AccountStatus {
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

export default function BillingPage() {
  const { user, isLoaded } = useUser();
  const [dbUser, setDbUser] = React.useState<DbUser | null>(null);
  const [accountStatus, setAccountStatus] =
    React.useState<AccountStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadUserData = React.useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/user/billing");
      const data = await response.json();

      if (data.error) {
        console.error("Error loading user data:", data.error);
        setError(data.error);
        return;
      }

      setDbUser(data.user);
      setAccountStatus(data.accountStatus);
    } catch (error) {
      console.error("Error loading user data:", error);
      setError("Failed to load user data");
    }
  }, []);

  React.useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  if (!isLoaded) return null;
  if (!user) {
    redirect("/sign-in");
    return null;
  }

  // Handle errors with retry option
  if (error || !dbUser) {
    return (
      <div className="text-center p-4">
        <p className="text-red-500 mb-4">
          {error || "Error loading user data"}
        </p>
        <button
          type="button"
          onClick={loadUserData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <BillingPageClient
      userId={user.id}
      dbUser={dbUser}
      accountStatus={accountStatus}
    />
  );
}
