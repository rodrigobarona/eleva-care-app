import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { handleApiError } from '@/lib/api/error';
import { hasRole } from '@/lib/auth/roles';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { type NextRequest, NextResponse } from 'next/server';

// GET /api/admin/users - Get all users with pagination
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and superadmin roles can access user list
    const isAdmin = await hasRole(userId, 'admin');
    const isSuperAdmin = await hasRole(userId, 'superadmin');
    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const url = new URL(req.url);
    const page = Number.parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = Number.parseInt(url.searchParams.get('pageSize') || '10', 10);

    // Get all users from the database
    const users = await db.select().from(UserTable);

    // Get all users from Clerk API using the clerkClient
    const clerkInstance = await clerkClient();
    const clerkUsers = await clerkInstance.users.getUserList({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: '-created_at',
    });

    // Calculate pagination
    const totalUsers = clerkUsers.totalCount || clerkUsers.data.length;
    const totalPages = Math.ceil(totalUsers / pageSize);

    // Combine data from Clerk with user roles from our database
    const combinedUsers = clerkUsers.data.map((clerkUser) => {
      const dbUser = users.find((u) => u.clerkUserId === clerkUser.id);
      return {
        id: clerkUser.id,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        imageUrl: clerkUser.imageUrl,
        lastSignInAt: clerkUser.lastSignInAt,
        createdAt: clerkUser.createdAt,
        role: dbUser?.role || 'user',
      };
    });

    return NextResponse.json({
      users: combinedUsers,
      pagination: {
        total: totalUsers,
        pageSize,
        currentPage: page,
        totalPages,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
