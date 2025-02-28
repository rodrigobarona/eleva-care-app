import {
  completeOnboardingStep,
  type OnboardingStep,
  publishExpertProfile,
} from '@/lib/auth/expert-onboarding';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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
    const { action } = body;

    switch (action) {
      case 'completeStep': {
        const { step } = body;
        if (!step) {
          return NextResponse.json(
            { error: 'Bad Request', message: 'Step is required' },
            { status: 400 },
          );
        }

        const updatedStatus = await completeOnboardingStep(userId, step as OnboardingStep);
        return NextResponse.json(updatedStatus);
      }

      case 'publishProfile': {
        const updatedStatus = await publishExpertProfile(userId);
        return NextResponse.json(updatedStatus);
      }

      default:
        return NextResponse.json(
          { error: 'Bad Request', message: 'Invalid action' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Error updating expert onboarding status:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json({ error: 'Internal Server Error', message }, { status: 500 });
  }
}
