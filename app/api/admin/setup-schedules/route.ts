import { listSchedules } from '@/lib/qstash';
import { setupQStashSchedules } from '@/lib/setup-qstash-schedules';
import { NextResponse } from 'next/server';

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';
export const maxDuration = 60;

// This endpoint requires authentication in a real-world scenario
// You should add authentication middleware to protect this endpoint

/**
 * GET: List all current QStash schedules
 */
export async function GET() {
  try {
    const schedules = await listSchedules();
    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Error listing schedules:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to list schedules: ${errorMessage}` },
      { status: 500 },
    );
  }
}

/**
 * POST: Setup or reset QStash schedules
 */
export async function POST() {
  try {
    const results = await setupQStashSchedules();

    // Count successes and failures
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Created ${successCount} schedules, ${failureCount} failures.`,
      results,
    });
  } catch (error) {
    console.error('Error setting up schedules:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to setup schedules: ${errorMessage}` },
      { status: 500 },
    );
  }
}
