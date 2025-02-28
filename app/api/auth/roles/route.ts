import { db } from '@/drizzle/db';
import { UserRoleTable } from '@/drizzle/schema';
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

    // Fetch user roles from the database
    const userRoles = await db.query.UserRoleTable.findMany({
      where: eq(UserRoleTable.clerkUserId, userId),
    });

    // Extract just the role names
    const roles = userRoles.map((ur) => ur.role);

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch user roles' },
      { status: 500 },
    );
  }
}
