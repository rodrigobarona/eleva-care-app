import { del } from "@vercel/blob";
import { db } from "@/drizzle/db";
import { ProfileTable } from "@/drizzle/schema";
import { profileFormSchema } from "@/schema/profile";
import type { z } from "zod";

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export async function updateProfile(userId: string, data: ProfileFormValues) {
  try {
    // Get existing profile first
    const existingProfile = await db.query.ProfileTable.findFirst({
      where: (profile, { eq }) => eq(profile.clerkUserId, userId)
    });

    // Delete old blob if it exists and is different from new picture
    if (existingProfile?.profilePicture?.includes("public.blob.vercel-storage.com") && 
        existingProfile.profilePicture !== data.profilePicture) {
      try {
        await del(existingProfile.profilePicture);
      } catch (error) {
        console.error("Failed to delete old profile picture:", error);
        // Continue execution even if deletion fails
      }
    }

    const validatedData = await profileFormSchema.parseAsync(data);

    await db
      .insert(ProfileTable)
      .values({
        ...validatedData,
        clerkUserId: userId,
      })
      .onConflictDoUpdate({
        target: ProfileTable.clerkUserId,
        set: validatedData,
      });

    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to update profile" };
  }
}
