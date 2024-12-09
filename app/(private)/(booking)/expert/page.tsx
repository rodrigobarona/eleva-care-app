import React from "react";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/drizzle/db";
import { ProfileTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { ExpertForm } from "@/components/organisms/forms/ExpertForm";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const { userId } = auth();
  if (!userId) return redirect("/sign-in");

  const profile = await db.query.ProfileTable.findFirst({
    where: eq(ProfileTable.clerkUserId, userId),
  });

  if (!profile) {
    return redirect("/sign-in"); // or wherever you want to redirect unauthorized users
  }

  // Transform the profile data to match the expected type
  const transformedProfile = profile
    ? {
        ...profile,
        socialLinks: profile.socialLinks || [],
        headline: profile.headline || undefined,
        profilePicture: profile.profilePicture || "",
        shortBio: profile.shortBio || undefined,
        longBio: profile.longBio || undefined,
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        isVerified: profile.isVerified || false,
        isTopExpert: profile.isTopExpert || false,
      }
    : null;

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your public profile information
        </p>
      </div>
      <ExpertForm initialData={transformedProfile} />
    </div>
  );
}
