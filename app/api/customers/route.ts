import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * GET handler for the /api/customers endpoint
 * Returns a list of customers for the logged-in expert
 */
export async function GET() {
  try {
    // Get the currently logged in user from Clerk
    const user = await currentUser();

    // Check if user is authenticated
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to access this resource' },
        { status: 401 },
      );
    }

    // Check if user has necessary role (could be expanded)
    const roles = Array.isArray(user.publicMetadata?.role)
      ? (user.publicMetadata.role as string[])
      : [user.publicMetadata?.role as string];

    const isExpert = roles.some((role) => role === 'community_expert' || role === 'top_expert');

    if (!isExpert) {
      return NextResponse.json(
        { error: 'You do not have permission to access this resource' },
        { status: 403 },
      );
    }

    // Return empty customers array
    // This will be replaced with actual database queries in the future
    return NextResponse.json({
      customers: [],
      totalCount: 0,
    });
  } catch (error) {
    console.error('Error in customers API route:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
