import { db } from '@/drizzle/db';
import { ProfileTable, UserTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 },
      );
    }

    // First get the user to check if they exist
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'Not Found', message: 'User not found' }, { status: 404 });
    }

    // Then get their profile
    const profile = await db.query.ProfileTable.findFirst({
      where: eq(ProfileTable.clerkUserId, userId),
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Profile not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      expertBio: profile.expertBio,
      specialties: profile.expertSpecialties || [],
      qualifications: profile.expertQualifications || [],
      isExpertProfilePublished: profile.isExpertProfilePublished,
    });
  } catch (error) {
    console.error('Error fetching expert profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch expert profile' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { username, expertBio, specialties, qualifications } = body;

    // Validate username format if provided
    if (username) {
      const regex = /^[a-zA-Z0-9_-]{3,30}$/;
      if (!regex.test(username)) {
        return NextResponse.json(
          {
            error: 'Bad Request',
            message:
              'Username must be 3-30 characters and can only contain letters, numbers, underscores, and dashes',
          },
          { status: 400 },
        );
      }

      // Check if username is already taken by another user
      const existingUser = await db.query.UserTable.findFirst({
        where: eq(UserTable.username, username),
      });

      if (existingUser && existingUser.clerkUserId !== userId) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Username is already taken' },
          { status: 409 },
        );
      }

      // Update the username in UserTable
      if (username) {
        await db
          .update(UserTable)
          .set({ username, updatedAt: new Date() })
          .where(eq(UserTable.clerkUserId, userId));
      }
    }

    // Update the profile information
    const profile = await db.query.ProfileTable.findFirst({
      where: eq(ProfileTable.clerkUserId, userId),
    });

    if (!profile) {
      // Create profile if it doesn't exist
      const user = await db.query.UserTable.findFirst({
        where: eq(UserTable.clerkUserId, userId),
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Not Found', message: 'User not found' },
          { status: 404 },
        );
      }

      // Insert new profile with required fields
      await db.insert(ProfileTable).values({
        clerkUserId: userId,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        isExpert: true,
        expertBio,
        expertSpecialties: specialties,
        expertQualifications: qualifications,
      });
    } else {
      // Update existing profile
      await db
        .update(ProfileTable)
        .set({
          expertBio: expertBio !== undefined ? expertBio : profile.expertBio,
          expertSpecialties: specialties || profile.expertSpecialties,
          expertQualifications: qualifications || profile.expertQualifications,
          isExpert: true,
          updatedAt: new Date(),
        })
        .where(eq(ProfileTable.clerkUserId, userId));
    }

    // Get the updated data
    const updatedUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    const updatedProfile = await db.query.ProfileTable.findFirst({
      where: eq(ProfileTable.clerkUserId, userId),
    });

    return NextResponse.json({
      id: updatedUser?.id,
      username: updatedUser?.username,
      expertBio: updatedProfile?.expertBio,
      specialties: updatedProfile?.expertSpecialties || [],
      qualifications: updatedProfile?.expertQualifications || [],
      isExpertProfilePublished: updatedProfile?.isExpertProfilePublished,
    });
  } catch (error) {
    console.error('Error updating expert profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update expert profile' },
      { status: 500 },
    );
  }
}
