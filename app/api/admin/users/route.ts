import { db } from '@/drizzle/db';
import { checkHasRole } from '@/lib/auth/server-auth';
import { clerkClient } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Verify the user has admin or superadmin role
    const authorized = await checkHasRole(['superadmin', 'admin']);

    if (!authorized) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Fetch all users from Clerk
    const clerk = await clerkClient();
    const { data: clerkUsers } = await clerk.users.getUserList({
      limit: 100,
    });

    // Fetch all user roles from our database
    const userRoles = await db.query.UserRoleTable.findMany();

    // Group roles by user ID
    const rolesByUserId: Record<string, string[]> = {};
    for (const userRole of userRoles) {
      if (!rolesByUserId[userRole.clerkUserId]) {
        rolesByUserId[userRole.clerkUserId] = [];
      }
      rolesByUserId[userRole.clerkUserId].push(userRole.role);
    }

    // Fetch our database users to get additional info
    const dbUsers = await db.query.UserTable.findMany();
    const dbUsersByClerkId = dbUsers.reduce(
      (acc, user) => {
        acc[user.clerkUserId] = user;
        return acc;
      },
      {} as Record<string, (typeof dbUsers)[0]>,
    );

    // Map Clerk users to our expected format
    const users = clerkUsers.map((clerkUser: User) => {
      const dbUser = dbUsersByClerkId[clerkUser.id];
      return {
        id: dbUser?.id || '',
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        roles: rolesByUserId[clerkUser.id] || ['user'], // Default to 'user' if no roles found
        createdAt: clerkUser.createdAt,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch users' },
      { status: 500 },
    );
  }
}
