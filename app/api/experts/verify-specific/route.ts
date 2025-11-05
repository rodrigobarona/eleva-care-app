import { hasRole } from '@/lib/auth/roles.server';
import { verifyAndUpdateSpecificExpert } from '@/server/actions/experts';
import { withAuth } from '@workos-inc/authkit-nextjs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const preferredRegion = 'auto';

export async function POST(req: NextRequest) {
  try {
    const { user } = await withAuth();
    const userId = user?.id;

    if (!user || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify if the user is an admin
    const isAdmin = (await hasRole('admin')) || (await hasRole('superadmin'));

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can verify other experts' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const result = await verifyAndUpdateSpecificExpert(email);

    if (result.error) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in verify-specific endpoint:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
