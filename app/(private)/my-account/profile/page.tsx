import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { ProfileTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { ProfileForm } from "@/components/forms/ProfileForm";

export default async function ProfilePage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const profile = await db.query.ProfileTable.findFirst({
    where: eq(ProfileTable.clerkUserId, userId),
  });

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your public profile information
        </p>
      </div>
      <ProfileForm initialData={profile || null} />
    </div>
  );
}
