import { db } from '@/drizzle/db';
import { EventTable } from '@/drizzle/schema';
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

    // Get the slug from query parameters
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Slug parameter is required' },
        { status: 400 },
      );
    }

    // Check if the slug is valid
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        {
          error: 'Invalid Slug',
          message: 'Slug can only contain lowercase letters, numbers, and hyphens',
          available: false,
        },
        { status: 400 },
      );
    }

    // Check if the slug is too short or too long
    if (slug.length < 3 || slug.length > 100) {
      return NextResponse.json(
        {
          error: 'Invalid Slug',
          message: 'Slug must be between 3 and 100 characters',
          available: false,
        },
        { status: 400 },
      );
    }

    // Check if the slug is a reserved word
    const reservedSlugs = [
      'api',
      'admin',
      'settings',
      'dashboard',
      'calendar',
      'events',
      'new',
      'edit',
    ];
    if (reservedSlugs.includes(slug)) {
      return NextResponse.json(
        {
          error: 'Reserved Slug',
          message: 'This URL is reserved and cannot be used',
          available: false,
        },
        { status: 400 },
      );
    }

    // Check if the slug already exists
    const existingEvent = await db.query.EventTable.findFirst({
      where: eq(EventTable.slug, slug),
    });

    return NextResponse.json({
      available: !existingEvent,
    });
  } catch (error) {
    console.error('Error checking slug availability:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to check slug availability' },
      { status: 500 },
    );
  }
}
