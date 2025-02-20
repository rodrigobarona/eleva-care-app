import { Skeleton } from '@/components/atoms/skeleton';
import { db } from '@/drizzle/db';
import { createClerkClient } from '@clerk/nextjs/server';
import { Instagram, Linkedin, Music, Twitter, Youtube } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
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

export default async function UserLayout(props: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const params = await props.params;

  const { username } = params;

  const { children } = props;

  return (
    <div className="container max-w-7xl pb-10 pt-32">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[400px_1fr]">
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
          alt={user.fullName || 'Profile picture'}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          placeholder="blur"
          blurDataURL={profile?.profilePicture || user.imageUrl}
        />
      </div>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">
            {profile ? `${profile.firstName} ${profile.lastName}` : user.fullName}
          </h1>
          <Link href={`/${user.username}`} className="text-muted-foreground hover:text-foreground">
            @{user.username}
          </Link>
        </div>
        {profile?.headline && <p className="text-lg font-medium">{profile.headline}</p>}
        {profile?.shortBio && <p className="text-muted-foreground">{profile.shortBio}</p>}
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
