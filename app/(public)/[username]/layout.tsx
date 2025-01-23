import React from "react";
import { createClerkClient } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { db } from "@/drizzle/db";
import { Instagram, Twitter, Linkedin, Youtube, Music } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { Skeleton } from "@/components/atoms/skeleton";
import { delay } from "@/lib/utils";

const SOCIAL_ICONS = {
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Music, // Using Music icon for TikTok since there's no TikTok icon in Lucide
} as const;

export const revalidate = 0;

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Profile Image Skeleton */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg">
        <Skeleton className="h-full w-full" />
      </div>

      <div className="space-y-4">
        {/* Name Skeleton */}
        <div>
          <Skeleton className="h-9 w-48 mb-2" /> {/* For the name */}
          <Skeleton className="h-5 w-32" /> {/* For the username */}
        </div>

        {/* Headline Skeleton */}
        <Skeleton className="h-6 w-full" />

        {/* Short Bio Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[80%]" />
        </div>

        {/* Social Links Skeleton */}
        <div className="flex gap-4">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default async function UserLayout({
  children,
  params: { username },
}: {
  children: React.ReactNode;
  params: { username: string };
}) {
  return (
    <div className="container max-w-7xl pt-32 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-[400px_1fr] gap-8">
        {/* Left Column - Profile Info with Suspense */}
        <React.Suspense fallback={<ProfileSkeleton />}>
          <ProfileInfo username={username} />
        </React.Suspense>

        {/* Right Column - Content */}
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}

// Separate component for profile info
async function ProfileInfo({ username }: { username: string }) {
  // Only delay in development
  if (process.env.NODE_ENV === "development") {
    await delay(3000);
  }

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
          <Link
            href={`/${user.username}`}
            className="text-muted-foreground hover:text-foreground"
          >
            @{user.username}
          </Link>
        </div>
        {profile?.headline && (
          <p className="text-lg font-medium">{profile.headline}</p>
        )}
        {profile?.shortBio && (
          <p className="text-muted-foreground">{profile.shortBio}</p>
        )}
        {profile?.longBio && (
          <div className="prose prose-sm dark:prose-invert">
            <ReactMarkdown>{profile.longBio}</ReactMarkdown>
          </div>
        )}
        {profile?.socialLinks && profile.socialLinks.length > 0 && (
          <div className="flex gap-4">
            {profile.socialLinks.map((link) => {
              if (!link.url) return null;
              const Icon = SOCIAL_ICONS[link.name as keyof typeof SOCIAL_ICONS];
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
  );
}
