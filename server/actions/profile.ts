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
      where: (profile, { eq }) => eq(profile.clerkUserId, userId),
    });

    // Delete old blob if it exists and is different from new picture
    if (
      existingProfile?.profilePicture?.includes(
        "public.blob.vercel-storage.com"
      ) &&
      existingProfile.profilePicture !== data.profilePicture
    ) {
      try {
        await del(existingProfile.profilePicture);
      } catch (error) {
        console.error("Failed to delete old profile picture:", error);
        // Continue execution even if deletion fails
      }
    }

    // Transform social links to full URLs
    const transformedData = {
      ...data,
      socialLinks: data.socialLinks.map((link) => {
        console.log('Raw input:', { name: link.name, url: link.url });

        // If empty or undefined URL, return empty string
        if (!link.url?.trim()) {
          return { name: link.name, url: "" };
        }

        // If it's already a full URL, validate it minimally
        if (link.url.startsWith('http')) {
          try {
            new URL(link.url); // Validate URL format
            return { name: link.name, url: link.url };
          } catch {
            return { name: link.name, url: "" };
          }
        }

        // Handle username input
        const username = link.url.replace(/^@/, '').trim();
        if (!username || !/^[a-zA-Z0-9._-]+$/.test(username)) {
          return { name: link.name, url: "" };
        }

        switch (link.name) {
          case "instagram":
            return { name: link.name, url: `https://instagram.com/${username}` };
          case "twitter":
            return { name: link.name, url: `https://x.com/${username}` };
          case "linkedin":
            return { name: link.name, url: `https://linkedin.com/in/${username}` };
          case "youtube":
            return { name: link.name, url: `https://youtube.com/@${username}` };
          case "tiktok":
            return { name: link.name, url: `https://tiktok.com/@${username}` };
          default:
            return link;
        }
      }),
      // Keep existing profile picture if none provided
      profilePicture:
        data.profilePicture || existingProfile?.profilePicture || null,
    };

    const validatedData = await profileFormSchema.parseAsync(transformedData);

    await db
      .insert(ProfileTable)
      .values({
        ...validatedData,
        clerkUserId: userId,
        socialLinks: validatedData.socialLinks as {
          name: string;
          url: string;
        }[],
      })
      .onConflictDoUpdate({
        target: ProfileTable.clerkUserId,
        set: {
          ...validatedData,
          socialLinks: validatedData.socialLinks as {
            name: string;
            url: string;
          }[],
        },
      });

    return { success: true };
  } catch (error) {
    console.error("Profile update error:", error);
    return { error: "Failed to update profile" };
  }
}
