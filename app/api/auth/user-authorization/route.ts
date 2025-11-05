import { getUserRole } from '@/lib/auth/roles.server';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { user } = await withAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 },
      );
    }

    // Get user role
    const role = await getUserRole();

    return NextResponse.json({
      role,
    });
  } catch (error) {
    console.error('Error fetching user authorization details:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch user authorization details' },
      { status: 500 },
    );
  }
}
