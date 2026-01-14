import { db } from '@/drizzle/db';
import { PaymentTransfersTable } from '@/drizzle/schema';
import {
  PAYMENT_TRANSFER_STATUS_APPROVED,
  PAYMENT_TRANSFER_STATUS_PENDING,
} from '@/lib/constants/payment-transfers';
import { RateLimitCache } from '@/lib/redis/manager';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/** Zod schema for transfer approval request */
const approveTransferSchema = z.object({
  transferId: z.number({ required_error: 'Transfer ID is required' }),
});

// Admin financial operations rate limiting (very strict)
const ADMIN_APPROVAL_RATE_LIMITS = {
  // Individual admin limits (strict)
  ADMIN: {
    maxAttempts: 50,
    windowSeconds: 3600, // 1 hour
    description: 'approvals per admin per hour',
  },
  // Daily admin limits (additional protection)
  ADMIN_DAILY: {
    maxAttempts: 200,
    windowSeconds: 86400, // 24 hours
    description: 'approvals per admin per day',
  },
  // Global system protection for approvals
  GLOBAL: {
    maxAttempts: 500,
    windowSeconds: 600, // 10 minutes
    description: 'total approvals per 10 minutes',
  },
} as const;

/**
 * Enhanced admin approval rate limiting
 * Implements strict controls for financial operations
 */
async function checkAdminApprovalRateLimits(adminId: string) {
  try {
    // Layer 1: Admin-specific hourly limits
    const adminLimit = await RateLimitCache.checkRateLimit(
      `admin-approval:user:${adminId}`,
      ADMIN_APPROVAL_RATE_LIMITS.ADMIN.maxAttempts,
      ADMIN_APPROVAL_RATE_LIMITS.ADMIN.windowSeconds,
    );

    if (!adminLimit.allowed) {
      return {
        allowed: false,
        reason: 'admin_hourly_limit_exceeded',
        message: `Admin hourly approval limit reached. You can approve more transfers in ${Math.ceil((adminLimit.resetTime - Date.now()) / 1000)} seconds.`,
        resetTime: adminLimit.resetTime,
        remaining: adminLimit.remaining,
        limit: `${ADMIN_APPROVAL_RATE_LIMITS.ADMIN.maxAttempts} ${ADMIN_APPROVAL_RATE_LIMITS.ADMIN.description}`,
      };
    }

    // Layer 2: Admin daily limits (fraud protection)
    const adminDailyLimit = await RateLimitCache.checkRateLimit(
      `admin-approval:user-daily:${adminId}`,
      ADMIN_APPROVAL_RATE_LIMITS.ADMIN_DAILY.maxAttempts,
      ADMIN_APPROVAL_RATE_LIMITS.ADMIN_DAILY.windowSeconds,
    );

    if (!adminDailyLimit.allowed) {
      return {
        allowed: false,
        reason: 'admin_daily_limit_exceeded',
        message:
          'Daily approval limit reached. Please contact a supervisor if you need to approve more transfers today.',
        resetTime: adminDailyLimit.resetTime,
        remaining: adminDailyLimit.remaining,
        limit: `${ADMIN_APPROVAL_RATE_LIMITS.ADMIN_DAILY.maxAttempts} ${ADMIN_APPROVAL_RATE_LIMITS.ADMIN_DAILY.description}`,
      };
    }

    // Layer 3: Global system protection
    const globalLimit = await RateLimitCache.checkRateLimit(
      'admin-approval:global',
      ADMIN_APPROVAL_RATE_LIMITS.GLOBAL.maxAttempts,
      ADMIN_APPROVAL_RATE_LIMITS.GLOBAL.windowSeconds,
    );

    if (!globalLimit.allowed) {
      return {
        allowed: false,
        reason: 'system_limit_exceeded',
        message: 'System approval capacity reached. Please try again in a few minutes.',
        resetTime: globalLimit.resetTime,
        remaining: globalLimit.remaining,
        limit: `${ADMIN_APPROVAL_RATE_LIMITS.GLOBAL.maxAttempts} ${ADMIN_APPROVAL_RATE_LIMITS.GLOBAL.description}`,
      };
    }

    // All limits passed
    return {
      allowed: true,
      limits: {
        admin: {
          remaining: adminLimit.remaining,
          resetTime: adminLimit.resetTime,
          totalHits: adminLimit.totalHits,
        },
        adminDaily: {
          remaining: adminDailyLimit.remaining,
          resetTime: adminDailyLimit.resetTime,
          totalHits: adminDailyLimit.totalHits,
        },
        global: {
          remaining: globalLimit.remaining,
          resetTime: globalLimit.resetTime,
          totalHits: globalLimit.totalHits,
        },
      },
    };
  } catch (error) {
    console.error('Redis admin approval rate limiting error:', error);

    // For admin financial operations, apply conservative fallback
    console.warn('Admin approval rate limiting failed - applying conservative restriction');
    return {
      allowed: false,
      reason: 'rate_limiting_error',
      message: 'Approval system is temporarily unavailable. Please try again in a moment.',
      fallback: true,
    };
  }
}

/**
 * Record admin approval rate limit attempts
 */
async function recordAdminApprovalAttempts(adminId: string) {
  try {
    await Promise.all([
      RateLimitCache.recordAttempt(
        `admin-approval:user:${adminId}`,
        ADMIN_APPROVAL_RATE_LIMITS.ADMIN.windowSeconds,
      ),
      RateLimitCache.recordAttempt(
        `admin-approval:user-daily:${adminId}`,
        ADMIN_APPROVAL_RATE_LIMITS.ADMIN_DAILY.windowSeconds,
      ),
      RateLimitCache.recordAttempt(
        'admin-approval:global',
        ADMIN_APPROVAL_RATE_LIMITS.GLOBAL.windowSeconds,
      ),
    ]);
  } catch (error) {
    console.error('Error recording admin approval rate limit attempts:', error);
    // Continue execution even if recording fails
  }
}

/**
 * POST endpoint to manually approve a pending expert transfer
 * Enhanced with Redis-based rate limiting for financial operations
 * This can only be used by administrators and requires a valid transferId
 *
 * Note: Admin authorization is handled by the proxy middleware
 */
export async function POST(request: NextRequest) {
  try {
    // Get userId for audit logging and rate limiting
    const { user } = await withAuth();
    const userId = user?.id;
    if (!user || !userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // **RATE LIMITING: Apply admin approval limits**
    const rateLimitResult = await checkAdminApprovalRateLimits(userId);

    if (!rateLimitResult.allowed) {
      console.log(`Admin approval rate limit exceeded for admin ${userId}:`, {
        reason: rateLimitResult.reason,
        limit: rateLimitResult.limit,
        resetTime: rateLimitResult.resetTime,
      });

      return NextResponse.json(
        {
          error: rateLimitResult.message,
          details: {
            reason: rateLimitResult.reason,
            resetTime: rateLimitResult.resetTime,
            limit: rateLimitResult.limit,
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit || 'Admin approval rate limit exceeded',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '0',
            'Retry-After': rateLimitResult.resetTime
              ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
              : '300', // 5 minutes default
          },
        },
      );
    }

    const body = await request.json();
    const parseResult = approveTransferSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { transferId } = parseResult.data;

    // Check if the transfer exists and is in the correct status
    const transfer = await db.query.PaymentTransfersTable.findFirst({
      where: eq(PaymentTransfersTable.id, transferId),
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    if (transfer.status !== PAYMENT_TRANSFER_STATUS_PENDING) {
      return NextResponse.json(
        {
          error: 'Transfer cannot be approved',
          details: `Transfer is in status: ${transfer.status}, only PENDING transfers can be approved`,
        },
        { status: 400 },
      );
    }

    // **RECORD RATE LIMIT ATTEMPT: Only after validation but before approval**
    await recordAdminApprovalAttempts(userId);

    // Update transfer to approved status
    await db
      .update(PaymentTransfersTable)
      .set({
        status: PAYMENT_TRANSFER_STATUS_APPROVED,
        adminUserId: userId,
        updated: new Date(),
      })
      .where(eq(PaymentTransfersTable.id, transferId));

    console.log(`Admin ${userId} approved transfer ${transferId}`, {
      transferAmount: transfer.amount,
      expertId: transfer.expertClerkUserId,
      eventId: transfer.eventId,
      timestamp: new Date().toISOString(),
    });

    // Prepare success response with rate limit info
    const response = NextResponse.json({
      success: true,
      message: 'Transfer approved successfully',
      transferId,
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
    });

    // Add rate limit headers to successful responses
    if (rateLimitResult.limits) {
      response.headers.set(
        'X-RateLimit-Admin-Remaining',
        rateLimitResult.limits.admin.remaining.toString(),
      );
      response.headers.set(
        'X-RateLimit-Admin-Daily-Remaining',
        rateLimitResult.limits.adminDaily.remaining.toString(),
      );
      response.headers.set(
        'X-RateLimit-Global-Remaining',
        rateLimitResult.limits.global.remaining.toString(),
      );
    }

    return response;
  } catch (error) {
    console.error('Error approving transfer:', error);
    // Sanitize error details in production to avoid leaking sensitive info
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: 'Failed to approve transfer',
        ...(isDev && { details: (error as Error).message }),
      },
      { status: 500 },
    );
  }
}
