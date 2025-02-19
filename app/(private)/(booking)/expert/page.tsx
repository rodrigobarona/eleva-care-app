import { redirect } from 'next/navigation';

import { db } from '@/drizzle/db';
import { ProfileTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { ExpertForm } from '@/components/organisms/forms/ExpertForm';

export default async function ProfilePage() {
  const { userId } = auth();
  if (!userId) return redirect('/sign-in');

  // Try to find existing profile
  const profile = await db.query.ProfileTable.findFirst({
    where: eq(ProfileTable.clerkUserId, userId),
  });

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
      };

      return (
        <div className="container max-w-4xl py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">Manage your public profile information</p>
          </div>
          <ExpertForm initialData={transformedProfile} />
        </div>
      );
    } catch (error) {
      console.error('Error creating profile:', error);
      return redirect('/events'); // Redirect on error
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
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Manage your public profile information</p>
      </div>
      <ExpertForm initialData={transformedProfile} />
    </div>
  );
}
