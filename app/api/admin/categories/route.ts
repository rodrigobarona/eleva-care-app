import { db } from '@/drizzle/db';
import { CategoryTable } from '@/drizzle/schema';
import { hasRole } from '@/lib/auth/roles.server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Helper function to check if user is admin
async function isAdmin(_userId: string) {
  return (await hasRole('admin')) || (await hasRole('superadmin'));
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!(await isAdmin(userId))) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const categories = await db.select().from(CategoryTable);
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!(await isAdmin(userId))) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const image = formData.get('image') as string;
    const parentId = formData.get('parentId') as string;

    if (!name) {
      return new NextResponse('Name is required', { status: 400 });
    }

    const newCategory = await db
      .insert(CategoryTable)
      .values({
        name,
        description: description || null,
        image: image || null,
        parentId: parentId || null,
      })
      .returning();

    return NextResponse.json(newCategory[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!(await isAdmin(userId))) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return new NextResponse('Category ID is required', { status: 400 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const image = formData.get('image') as string;

    if (!name) {
      return new NextResponse('Name is required', { status: 400 });
    }

    const updatedCategory = await db
      .update(CategoryTable)
      .set({
        name,
        description: description || null,
        image: image || null,
        updatedAt: new Date(),
      })
      .where(eq(CategoryTable.id, id))
      .returning();

    if (!updatedCategory.length) {
      return new NextResponse('Category not found', { status: 404 });
    }

    return NextResponse.json(updatedCategory[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!(await isAdmin(userId))) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return new NextResponse('Category ID is required', { status: 400 });
    }

    // First check if there are any subcategories
    const subcategories = await db
      .select()
      .from(CategoryTable)
      .where(eq(CategoryTable.parentId, id));

    if (subcategories.length > 0) {
      return new NextResponse(
        'Cannot delete category with subcategories. Delete subcategories first.',
        { status: 400 },
      );
    }

    // Then check if the category is used as primary or secondary category in any profile
    // TODO: Add check for profile references once profile table is available

    const deletedCategory = await db
      .delete(CategoryTable)
      .where(eq(CategoryTable.id, id))
      .returning();

    if (!deletedCategory.length) {
      return new NextResponse('Category not found', { status: 404 });
    }

    return NextResponse.json(deletedCategory[0]);
  } catch (error) {
    console.error('Error deleting category:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
