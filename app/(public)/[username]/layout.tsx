import type React from "react";
import { createClerkClient } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { db } from "@/drizzle/db";
import { Instagram, Twitter, Linkedin, Youtube, Music } from "lucide-react";

const SOCIAL_ICONS = {
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Music, // Using Music icon for TikTok since there's no TikTok icon in Lucide
} as const;

export const revalidate = 0;

export default async function UserLayout({
  children,
  params: { username },
}: {
  children: React.ReactNode;
  params: { username: string };
}) {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  const users = await clerk.users.getUserList({
    username: [username],
  });

  const user = users.data[0];
  if (!user) return notFound();

  const profile = await db.query.ProfileTable.findFirst({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, user.id),
  });

  return (
    <div className="container max-w-7xl py-10">
      <div className="grid grid-cols-1 md:grid-cols-[400px_1fr] gap-8">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg">
            <Image
              src={profile?.profilePicture || user.imageUrl}
              alt={user.fullName || "Profile picture"}
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold">
                {profile
                  ? `${profile.firstName} ${profile.lastName}`
                  : user.fullName}
              </h1>
              <p className="text-muted-foreground">@{user.username}</p>
            </div>
            {profile?.headline && (
              <p className="text-lg font-medium">{profile.headline}</p>
            )}
            {profile?.shortBio && (
              <p className="text-muted-foreground">{profile.shortBio}</p>
            )}
            {profile?.longBio && (
              <div className="prose prose-sm dark:prose-invert">
                <p>{profile.longBio}</p>
              </div>
            )}
            {profile?.socialLinks && profile.socialLinks.length > 0 && (
              <div className="flex gap-4">
                {profile.socialLinks.map((link) => {
                  if (!link.url) return null;
                  const Icon = SOCIAL_ICONS[link.name];
                  return (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {Icon && <Icon className="h-5 w-5" />}
                      <span className="sr-only">{link.name}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Content */}
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
