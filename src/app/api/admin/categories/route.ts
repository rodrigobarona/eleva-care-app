import { db } from '@/drizzle/db';
import { CategoriesTable } from '@/drizzle/schema';
import { hasRole } from '@/lib/auth/roles.server';
import type { ApiResponse } from '@/types/api';
import { WORKOS_ROLES } from '@/types/workos-rbac';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { checkBotId } from 'botid/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

/** Zod schema for category creation/update */
const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
});

/**
 * GET - List all categories
 *
 * Note: Admin authorization is handled by the proxy middleware
 */
export async function GET() {
  try {
    const categories = await db.select().from(CategoriesTable);
    return NextResponse.json({
      success: true,
      data: categories,
    } as ApiResponse<unknown[]>);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error fetching categories',
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}

/**
 * POST - Create a new category
 *
 * Note: Admin authorization is handled by the proxy middleware
 */
export async function POST(request: Request) {
  // Defense-in-depth: verify admin even though proxy should enforce this
  const { user } = await withAuth();
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' } as ApiResponse<null>,
      { status: 401 },
    );
  }
  const isSuperAdmin = await hasRole(WORKOS_ROLES.SUPERADMIN);
  if (!isSuperAdmin) {
    return NextResponse.json(
      { success: false, error: 'Forbidden' } as ApiResponse<null>,
      { status: 403 },
    );
  }

  // 🛡️ BotID Protection: Check for bot traffic before admin operations
  const botVerification = (await checkBotId({
    advancedOptions: {
      checkLevel: 'basic',
    },
  })) as import('@/types/botid').BotIdVerificationResult;

  if (botVerification.isBot && !botVerification.isVerifiedBot) {
    console.warn('🚫 Bot detected in admin category creation:', {
      isVerifiedBot: botVerification.isVerifiedBot,
      verifiedBotName: botVerification.verifiedBotName,
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Access denied',
        message: 'Automated admin operations are not allowed',
      },
      { status: 403 },
    );
  }

  try {
    const formData = await request.formData();
    const parsed = categorySchema.safeParse({
      name: formData.get('name'),
      description: formData.get('description'),
      image: formData.get('image'),
      parentId: formData.get('parentId'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || 'Validation failed',
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const { name, description, image, parentId } = parsed.data;

    const newCategory = (await db
      .insert(CategoriesTable)
      .values({
        name,
        description: description || null,
        image: image || null,
        parentId: parentId === 'null' ? null : parentId || null,
      })
      .returning()) as Array<typeof CategoriesTable.$inferSelect>;

    return NextResponse.json({
      success: true,
      data: newCategory[0],
    } as ApiResponse<typeof newCategory[0]>);
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
