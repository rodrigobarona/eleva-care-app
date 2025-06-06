import { Skeleton } from '@/components/atoms/skeleton';
import { EventBookingList } from '@/components/molecules/EventBookingList';
import { db } from '@/drizzle/db';
import { createClerkClient } from '@clerk/nextjs/server';
import { Instagram, Linkedin, Music, Twitter, Youtube } from 'lucide-react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import React from 'react';
import ReactMarkdown from 'react-markdown';

const SOCIAL_ICONS = {
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Music, // Using Music icon for TikTok since there's no TikTok icon in Lucide
} as const;

export const revalidate = 60; // Changed from 0 to 60 seconds

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
          <Skeleton className="mb-2 h-9 w-48" /> {/* For the name */}
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

// Updated PageProps type with proper next params - params as Promise
interface PageProps {
  params: Promise<{
    username: string;
    locale: string;
  }>;
}

export default async function UserLayout(props: PageProps) {
  // Await the params
  const params = await props.params;
  const { username, locale } = params;

  // Get user data early
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const users = await clerk.users.getUserList({
    username: [username],
  });

  const user = users.data[0];
  if (!user) return notFound();

  return (
    <div className="container max-w-7xl pb-10 pt-32">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[400px_1fr]">
        {/* Left Column - Profile Info with Suspense */}
        <React.Suspense fallback={<ProfileSkeleton />}>
          <ProfileInfo
            username={username}
            locale={locale}
            clerkUserId={user.id}
            clerkUserImageUrl={user.imageUrl}
            clerkUserFullName={user.fullName}
          />
        </React.Suspense>

        {/* Right Column - Content */}
        <div className="space-y-6">
          <EventBookingList userId={user.id} username={username} />
        </div>
      </div>
    </div>
  );
}

// Separate component for profile info
interface ProfileInfoProps {
  username: string; // Keep username for potential future use or logging
  locale: string;
  clerkUserId: string;
  clerkUserImageUrl: string;
  clerkUserFullName: string | null;
}

async function ProfileInfo({
  username: _username, // Renamed to avoid confusion if used directly
  locale: _locale,
  clerkUserId,
  clerkUserImageUrl,
  clerkUserFullName, // Ensure this is used or remove if not needed
}: ProfileInfoProps) {
  // User data is now passed from UserLayout, no need to fetch Clerk user here.
  // The 'user' object previously fetched here is replaced by passed props.

  const profile = await db.query.ProfileTable.findFirst({
    where: ({ clerkUserId: profileClerkUserId }, { eq }) => eq(profileClerkUserId, clerkUserId),
    with: {
      primaryCategory: true,
      secondaryCategory: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="relative aspect-[18/21] w-full overflow-hidden rounded-lg">
        <Image
          src={profile?.profilePicture || clerkUserImageUrl}
          alt={clerkUserFullName || 'Profile picture'}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          placeholder="blur"
          // Removed ineffective blurDataURL={profile?.profilePicture || clerkUserImageUrl}
        />
        {/* Top Expert Badge */}
        {profile?.isTopExpert && (
          <div className="absolute bottom-4 left-3">
            <span className="rounded-sm bg-white px-3 py-2 text-base font-medium text-eleva-neutral-900">
              <span>Top Expert</span>
            </span>
          </div>
        )}
      </div>
      <div className="space-y-12">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-medium">
            {profile ? `${profile.firstName} ${profile.lastName}` : clerkUserFullName}
            {profile?.isVerified && (
              <Image
                src="/img/expert-verified-icon.svg"
                alt=""
                className="h-5 w-5"
                aria-hidden="true"
                width={32}
                height={32}
              />
            )}
          </h1>
          {profile?.headline && (
            <p className="text-sm font-medium text-eleva-neutral-900/60">{profile.headline}</p>
          )}
          {/* Categories */}
          {(profile?.primaryCategory || profile?.secondaryCategory) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.primaryCategory && (
                <span className="rounded-full bg-eleva-neutral-100 px-3 py-1 text-sm font-medium text-eleva-neutral-900">
                  {(profile.primaryCategory as { name: string }).name}
                </span>
              )}
              {profile.secondaryCategory && (
                <span className="rounded-full bg-eleva-neutral-100 px-3 py-1 text-sm font-medium text-eleva-neutral-900">
                  {(profile.secondaryCategory as { name: string }).name}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <h2 className="flex w-full items-center justify-between text-xl font-medium text-eleva-neutral-900">
            About me
            {profile?.socialLinks && profile.socialLinks.length > 0 && (
              <div className="flex gap-3">
                {profile.socialLinks.map((link) => {
                  if (!link.url) return null;
                  const Icon = SOCIAL_ICONS[link.name as keyof typeof SOCIAL_ICONS];
                  return (
                    <a
                      key={link.name}
                      href={link.url}
                      target="_blank"
                      rel="noopener nofollow noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {Icon && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-eleva-neutral-200 p-1">
                          <Icon className="h-5 w-5 text-eleva-neutral-900" />
                        </span>
                      )}
                      <span className="sr-only">{link.name}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </h2>
          {profile?.longBio && (
            <div className="prose-eleva-neutral-900 prose-font-light prose prose-base">
              <ReactMarkdown>{profile.longBio}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
