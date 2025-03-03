import { db } from '@/drizzle/db';
import { CategoryTable } from '@/drizzle/schema';
import { hasRole } from '@/lib/auth/roles.server';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Helper function to check if user is admin
async function isAdmin(_userId: string) {
  return (await hasRole('admin')) || (await hasRole('superadmin'));
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const categories = await db.select().from(CategoryTable);
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const image = formData.get('image') as string;
    const parentId = formData.get('parentId') as string;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const newCategory = await db
      .insert(CategoryTable)
      .values({
        name,
        description: description || null,
        image: image || null,
        parentId: parentId === 'null' ? null : parentId || null,
      })
      .returning();

    return NextResponse.json(newCategory[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
