import { verifyExpertConnectAccount } from '@/server/actions/experts';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const preferredRegion = 'auto';

export async function POST() {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify if the user is an expert
    const user = await clerkClient.users.getUser(userId);
    const isExpert = user.publicMetadata?.role === 'expert';

    if (!isExpert) {
      return NextResponse.json(
        { error: 'Only experts can verify their Connect account' },
        { status: 403 },
      );
    }

    const result = await verifyExpertConnectAccount(userId);

    if (result.error) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in verify-connect endpoint:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
