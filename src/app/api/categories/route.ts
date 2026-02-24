import { db } from '@/drizzle/db';
import { CategoriesTable } from '@/drizzle/schema';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { user } = await withAuth();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const categories = await db.select().from(CategoriesTable).$withCache({
      tag: 'categories',
      config: { ex: 3600 },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
