"use client";

import React from "react";
import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { BillingPageClient } from "./billing-client";

export default function BillingPage() {
  const { user, isLoaded } = useUser();
  const [dbUser, setDbUser] = React.useState(null);
  const [accountStatus, setAccountStatus] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    async function loadUserData() {
      try {
        const response = await fetch("/api/user/billing");
        const data = await response.json();

        if (data.error) {
          console.error("Error loading user data:", data.error);
          return;
        }

        setDbUser(data.user);
        setAccountStatus(data.accountStatus);
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUserData();
  }, [user]);

  // Handle loading states
  if (!isLoaded || isLoading) {
    return <div>Loading...</div>; // You might want to use a proper loading component
  }

  // Handle authentication
  if (!user) {
    return redirect("/sign-in");
  }

  // Handle missing user data
  if (!dbUser) {
    return <div>Error loading user data. Please try again.</div>;
  }

  return (
    <BillingPageClient
      userId={user.id}
      dbUser={dbUser}
      accountStatus={accountStatus}
    />
  );
}
