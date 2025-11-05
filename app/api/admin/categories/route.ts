import { db } from '@/drizzle/db';
import { CategoriesTable } from '@/drizzle/schema-workos';
import { adminAuthMiddleware } from '@/lib/auth/admin-middleware';
import type { ApiResponse } from '@/types/api';
import { checkBotId } from 'botid/server';
import { NextResponse } from 'next/server';

export async function GET() {
  // Check admin authentication
  const authResponse = await adminAuthMiddleware();
  if (authResponse) return authResponse;

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

export async function POST(request: Request) {
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

  // Check admin authentication
  const authResponse = await adminAuthMiddleware();
  if (authResponse) return authResponse;

  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const image = formData.get('image') as string;
    const parentId = formData.get('parentId') as string;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const newCategory = (await db
      .insert(CategoriesTable)
      .values({
        name,
        description: description || null,
        image: image || null,
        parentId: parentId === 'null' ? null : parentId || null,
      })
      .returning()) as Array<typeof CategoriesTable.$inferSelect>;

    return NextResponse.json(newCategory[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
