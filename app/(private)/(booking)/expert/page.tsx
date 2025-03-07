import { ExpertForm } from '@/components/organisms/forms/ExpertForm';
import { ProfilePublishToggle } from '@/components/organisms/ProfilePublishToggle';
import { db } from '@/drizzle/db';
import { ProfileTable } from '@/drizzle/schema';
import { hasRole } from '@/lib/auth/roles.server';
import type { profileFormSchema } from '@/schema/profile';
import { markStepCompleteNoRevalidate } from '@/server/actions/expert-setup';
import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import type { z } from 'zod';

type ExpertFormValues = z.infer<typeof profileFormSchema> & {
  isVerified?: boolean;
  isTopExpert?: boolean;
  profilePicture: string;
  username?: string;
};

export default async function ProfilePage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    redirect('/unauthorized');
  }

  // Check if user has either community_expert OR top_expert role
  const isCommunityExpert = await hasRole('community_expert');
  const isTopExpert = await hasRole('top_expert');

  if (!isCommunityExpert && !isTopExpert) {
    redirect('/unauthorized');
  }

  // Try to find existing profile
  const profile = await db.query.ProfileTable.findFirst({
    where: eq(ProfileTable.clerkUserId, userId),
  });

  // If profile exists and has required fields filled, mark step as complete
  if (profile?.firstName && profile?.lastName && profile?.shortBio) {
    // Mark profile step as complete (non-blocking)
    try {
      await markStepCompleteNoRevalidate('profile');
    } catch (error) {
      console.error('Failed to mark profile step as complete:', error);
    }
  }

  // If no profile exists, create one with default values
  if (!profile) {
    try {
      const newProfile = await db
        .insert(ProfileTable)
        .values({
          clerkUserId: userId,
          firstName: '', // Required fields with empty defaults
          lastName: '',
          isVerified: false,
          isTopExpert: false,
        })
        .returning();

      // Transform the newly created profile
      const transformedProfile = {
        ...newProfile[0],
        socialLinks: [],
        headline: undefined,
        profilePicture: '',
        shortBio: undefined,
        longBio: undefined,
        firstName: '',
        lastName: '',
        isVerified: false,
        isTopExpert: false,
        primaryCategoryId: newProfile[0].primaryCategoryId || undefined,
        secondaryCategoryId: newProfile[0].secondaryCategoryId || undefined,
      };

      return (
        <div className="container max-w-4xl py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">Manage your public profile information</p>
          </div>
          <div className="mb-8 rounded-lg border bg-card p-6 shadow-sm">
            <ProfilePublishToggle initialPublishedStatus={false} />
          </div>
          <ExpertForm initialData={transformedProfile as ExpertFormValues} />
        </div>
      );
    } catch (error) {
      console.error('Error creating profile:', error);
      return redirect('/unauthorized'); // Redirect on error
    }
  }

  // Transform existing profile data
  const transformedProfile = {
    ...profile,
    socialLinks: profile.socialLinks || [],
    headline: profile.headline || undefined,
    profilePicture: profile.profilePicture || '',
    shortBio: profile.shortBio || undefined,
    longBio: profile.longBio || undefined,
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    isVerified: profile.isVerified || false,
    isTopExpert: profile.isTopExpert || false,
    primaryCategoryId: profile.primaryCategoryId || undefined,
    secondaryCategoryId: profile.secondaryCategoryId || undefined,
  };

  // Default to unpublished if no profile exists yet
  const isPublished = profile?.published ?? false;

  return (
    <div className="container py-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expert Profile</h1>
          <p className="text-muted-foreground">Manage your public expert profile information</p>
        </div>
        <ProfilePublishToggle initialPublishedStatus={isPublished} />
      </div>
      <div className="space-y-4">
        <ExpertForm initialData={transformedProfile as ExpertFormValues} />
      </div>
    </div>
  );
}
