import { db } from '@/drizzle/db';
import { CategoryTable } from '@/drizzle/schema';
import { hasRole } from '@/lib/auth/roles.server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Helper function to check if user is admin
async function isAdmin(_userId: string) {
  return (await hasRole('admin')) || (await hasRole('superadmin'));
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
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

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const updatedCategory = await db
      .update(CategoryTable)
      .set({
        name,
        description: description || null,
        image: image || null,
        updatedAt: new Date(),
      })
      .where(eq(CategoryTable.id, params.id))
      .returning();

    if (!updatedCategory.length) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(updatedCategory[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(userId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // First check if there are any subcategories
    const subcategories = await db
      .select()
      .from(CategoryTable)
      .where(eq(CategoryTable.parentId, params.id));

    if (subcategories.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with subcategories. Delete subcategories first.' },
        { status: 400 },
      );
    }

    const deletedCategory = await db
      .delete(CategoryTable)
      .where(eq(CategoryTable.id, params.id))
      .returning();

    if (!deletedCategory.length) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(deletedCategory[0]);
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}

// Make this route handler dynamic
export const dynamic = 'force-dynamic';
