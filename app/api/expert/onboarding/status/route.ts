import { getExpertOnboardingStatus } from '@/lib/auth/expert-onboarding';
import { auth } from '@clerk/nextjs/server';
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

    const onboardingStatus = await getExpertOnboardingStatus(userId);

    return NextResponse.json(onboardingStatus);
  } catch (error) {
    console.error('Error fetching expert onboarding status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch onboarding status' },
      { status: 500 },
    );
  }
} 