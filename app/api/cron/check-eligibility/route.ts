/**
 * Eligibility Checker Cron Job
 *
 * Runs daily to update subscription eligibility metrics for all experts.
 * Identifies experts who qualify for annual subscription plans.
 *
 * Schedule: Daily at 2:00 AM UTC
 * Trigger: Vercel Cron or manual via QStash
 *
 * What it does:
 * 1. Fetches all active experts
 * 2. Calculates eligibility metrics
 * 3. Updates AnnualPlanEligibilityTable
 * 4. Identifies newly eligible experts (for future notification)
 */
import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema-workos';
import { updateEligibilityMetrics } from '@/server/actions/eligibility';
import { inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// GET Handler - Manual Trigger
// ============================================================================

export async function GET() {
  return NextResponse.json({
    message: 'Eligibility Checker Cron Job',
    schedule: 'Daily at 2:00 AM UTC',
    description: 'Updates subscription eligibility metrics for all experts',
  });
}

// ============================================================================
// POST Handler - Cron Execution
// ============================================================================

export async function POST(_request: NextRequest) {
  const startTime = Date.now();

  console.log('🔍 Starting eligibility check cron job...');

  // TODO: Add QStash signature verification for production
  // For now, rely on Vercel Cron auth or add API key check

  try {
    // Get all active experts (community and top)
    const experts = await db.query.UsersTable.findMany({
      where: inArray(UsersTable.role, ['expert_community', 'expert_top', 'expert_lecturer']),
      columns: {
        id: true,
        workosUserId: true,
        role: true,
      },
    });

    console.log(`📊 Found ${experts.length} experts to process`);

    // Update eligibility for each expert
    let successCount = 0;
    let failCount = 0;
    const newlyEligible: string[] = [];

    for (const expert of experts) {
      try {
        const success = await updateEligibilityMetrics(expert.workosUserId);
        if (success) {
          successCount++;
          // TODO: Check if newly eligible and add to notification queue
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Error processing expert ${expert.workosUserId}:`, error);
        failCount++;
      }
    }

    const duration = Date.now() - startTime;

    console.log(`✅ Eligibility check complete:`, {
      total: experts.length,
      success: successCount,
      failed: failCount,
      newlyEligible: newlyEligible.length,
      durationMs: duration,
    });

    // TODO: Send notifications to newly eligible experts

    return NextResponse.json({
      success: true,
      stats: {
        total: experts.length,
        processed: successCount,
        failed: failCount,
        newlyEligible: newlyEligible.length,
        durationMs: duration,
      },
    });
  } catch (error) {
    console.error('❌ Eligibility check cron failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
