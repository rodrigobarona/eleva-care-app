import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const username = url.searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Username parameter is required' },
        { status: 400 },
      );
    }

    // Format validation: Only allow alphanumeric characters, underscores, and dashes
    const regex = /^[a-zA-Z0-9_-]{3,30}$/;
    if (!regex.test(username)) {
      return NextResponse.json(
        {
          available: false,
          message:
            'Username must be 3-30 characters and can only contain letters, numbers, underscores, and dashes',
        },
        { status: 200 },
      );
    }

    // Reserved username check
    const reservedUsernames = [
      'admin',
      'support',
      'help',
      'settings',
      'profile',
      'eleva',
      'elevateam',
      'api',
    ];
    if (reservedUsernames.includes(username.toLowerCase())) {
      return NextResponse.json(
        {
          available: false,
          message: 'This username is reserved and cannot be used',
        },
        { status: 200 },
      );
    }

    // Check if username exists in database
    const existingUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.username, username),
    });

    // If user is checking their own username, it's available for them
    if (existingUser && existingUser.clerkUserId === userId) {
      return NextResponse.json({ available: true }, { status: 200 });
    }

    return NextResponse.json(
      {
        available: !existingUser,
        message: existingUser ? 'Username is already taken' : undefined,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to check username' },
      { status: 500 },
    );
  }
}
