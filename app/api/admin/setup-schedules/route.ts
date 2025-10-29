import { adminAuthMiddleware } from '@/lib/auth/admin-middleware';
import { listSchedules } from '@/lib/qstash';
import { setupQStashSchedules } from '@/lib/setup-qstash-schedules';
import type { ApiResponse } from '@/types/api';
import { NextResponse } from 'next/server';

// Add route segment config
export const preferredRegion = 'auto';
export const maxDuration = 60;

/**
 * GET: List all current QStash schedules
 */
export async function GET() {
  // Check admin authentication
  const authResponse = await adminAuthMiddleware();
  if (authResponse) return authResponse;

  try {
    const schedules = await listSchedules();
    return NextResponse.json({
      success: true,
      data: { schedules },
    } as ApiResponse<{ schedules: unknown[] }>);
  } catch (error) {
    console.error('Error listing schedules:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: `Failed to list schedules: ${errorMessage}`,
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}

/**
 * POST: Setup or reset QStash schedules
 */
export async function POST() {
  // Check admin authentication
  const authResponse = await adminAuthMiddleware();
  if (authResponse) return authResponse;

  try {
    const results = await setupQStashSchedules();

    // Count successes and failures
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      data: {
        message: `Created ${successCount} schedules, ${failureCount} failures.`,
        results,
      },
    } as ApiResponse<{ message: string; results: unknown[] }>);
  } catch (error) {
    console.error('Error setting up schedules:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: `Failed to setup schedules: ${errorMessage}`,
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
