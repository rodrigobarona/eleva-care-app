import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema';
import { getServerStripe } from '@/lib/integrations/stripe';
import {
  createIdentityVerification,
  getIdentityVerificationStatus,
} from '@/lib/integrations/stripe/identity';
import { RateLimitCache } from '@/lib/redis/manager';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// Rate limiting configuration
const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes in milliseconds (fallback)

// Redis-based rate limiting configuration
const RATE_LIMITS = {
  // User-based limits (strictest)
  USER: {
    maxAttempts: 3,
    windowSeconds: 3600, // 1 hour
    description: 'per user per hour',
  },
  // IP-based limits (abuse prevention)
  IP: {
    maxAttempts: 10,
    windowSeconds: 3600, // 1 hour
    description: 'per IP per hour',
  },
  // Global system protection
  GLOBAL: {
    maxAttempts: 500,
    windowSeconds: 300, // 5 minutes
    description: 'system-wide per 5 minutes',
  },
} as const;

/**
 * Enhanced rate limiting with Redis-based distributed cache
 * Implements multi-layer protection: user + IP + global limits
 */
async function checkRateLimits(userId: string, clientIP: string) {
  try {
    // Layer 1: User-based rate limiting (strictest)
    const userLimit = await RateLimitCache.checkRateLimit(
      `identity-verification:user:${userId}`,
      RATE_LIMITS.USER.maxAttempts,
      RATE_LIMITS.USER.windowSeconds,
    );

    if (!userLimit.allowed) {
      return {
        allowed: false,
        reason: 'user_limit_exceeded',
        message: `Too many verification attempts. You can try again in ${Math.ceil((userLimit.resetTime - Date.now()) / 1000)} seconds.`,
        resetTime: userLimit.resetTime,
        remaining: userLimit.remaining,
        limit: `${RATE_LIMITS.USER.maxAttempts} ${RATE_LIMITS.USER.description}`,
      };
    }

    // Layer 2: IP-based rate limiting (abuse prevention)
    const ipLimit = await RateLimitCache.checkRateLimit(
      `identity-verification:ip:${clientIP}`,
      RATE_LIMITS.IP.maxAttempts,
      RATE_LIMITS.IP.windowSeconds,
    );

    if (!ipLimit.allowed) {
      return {
        allowed: false,
        reason: 'ip_limit_exceeded',
        message: `Too many verification attempts from this location. Please try again in ${Math.ceil((ipLimit.resetTime - Date.now()) / 1000)} seconds.`,
        resetTime: ipLimit.resetTime,
        remaining: ipLimit.remaining,
        limit: `${RATE_LIMITS.IP.maxAttempts} ${RATE_LIMITS.IP.description}`,
      };
    }

    // Layer 3: Global system protection
    const globalLimit = await RateLimitCache.checkRateLimit(
      'identity-verification:global',
      RATE_LIMITS.GLOBAL.maxAttempts,
      RATE_LIMITS.GLOBAL.windowSeconds,
    );

    if (!globalLimit.allowed) {
      return {
        allowed: false,
        reason: 'system_limit_exceeded',
        message:
          'System is currently experiencing high verification volume. Please try again in a few minutes.',
        resetTime: globalLimit.resetTime,
        remaining: globalLimit.remaining,
        limit: `${RATE_LIMITS.GLOBAL.maxAttempts} ${RATE_LIMITS.GLOBAL.description}`,
      };
    }

    // All limits passed
    return {
      allowed: true,
      limits: {
        user: {
          remaining: userLimit.remaining,
          resetTime: userLimit.resetTime,
          totalHits: userLimit.totalHits,
        },
        ip: {
          remaining: ipLimit.remaining,
          resetTime: ipLimit.resetTime,
          totalHits: ipLimit.totalHits,
        },
        global: {
          remaining: globalLimit.remaining,
          resetTime: globalLimit.resetTime,
          totalHits: globalLimit.totalHits,
        },
      },
    };
  } catch (error) {
    console.error('Redis rate limiting error:', error);

    // Fallback to original database-based rate limiting
    console.warn('Falling back to database-based rate limiting due to Redis error');
    return { allowed: true, fallback: true };
  }
}

/**
 * Record rate limit attempts across all layers
 */
async function recordRateLimitAttempts(userId: string, clientIP: string) {
  try {
    await Promise.all([
      RateLimitCache.recordAttempt(
        `identity-verification:user:${userId}`,
        RATE_LIMITS.USER.windowSeconds,
      ),
      RateLimitCache.recordAttempt(
        `identity-verification:ip:${clientIP}`,
        RATE_LIMITS.IP.windowSeconds,
      ),
      RateLimitCache.recordAttempt(
        'identity-verification:global',
        RATE_LIMITS.GLOBAL.windowSeconds,
      ),
    ]);
  } catch (error) {
    console.error('Error recording rate limit attempts:', error);
    // Continue execution even if recording fails
  }
}

/**
 * POST /api/stripe/identity/verification
 *
 * Creates or retrieves a Stripe Identity verification session
 * Enhanced with distributed Redis-based rate limiting
 *
 * @returns 200 - Success with redirect URL or verification status
 * @returns 400 - Error from verification creation
 * @returns 401 - Unauthorized if no user is authenticated
 * @returns 404 - User not found in database
 * @returns 429 - Too Many Requests when rate limit is exceeded
 * @returns 500 - Server error during verification session creation
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await withAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIP =
      forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

    // Enhanced rate limiting check
    const rateLimitResult = await checkRateLimits(user.id, clientIP);

    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user ${user.id} (IP: ${clientIP}):`, {
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
            'X-RateLimit-Limit': rateLimitResult.limit || 'unknown',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '0',
            'Retry-After': rateLimitResult.resetTime
              ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
              : '300', // 5 minutes default
          },
        },
      );
    }

    // Get user record from database
    const dbUser = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const stripe = await getServerStripe();

    // Check if user already has an active verification session
    if (dbUser.stripeIdentityVerificationId) {
      console.log(
        `User ${dbUser.id} already has a verification session: ${dbUser.stripeIdentityVerificationId}`,
      );

      // Get the status of the existing verification
      try {
        const verificationStatus = await getIdentityVerificationStatus(
          dbUser.stripeIdentityVerificationId,
        );

        // If already verified, return success with the status
        if (verificationStatus.status === 'verified') {
          return NextResponse.json({
            success: true,
            status: verificationStatus.status,
            verificationId: dbUser.stripeIdentityVerificationId,
            redirectUrl: null,
            message: 'Identity already verified',
          });
        }

        // If session is in a usable state (requires_input or processing), return it
        if (['requires_input', 'processing'].includes(verificationStatus.status)) {
          console.log(
            `Returning existing verification session in status: ${verificationStatus.status}`,
          );

          // Retrieve the existing session with URL
          try {
            const existingSession = await stripe.identity.verificationSessions.retrieve(
              dbUser.stripeIdentityVerificationId,
            );

            if (existingSession.url) {
              return NextResponse.json({
                success: true,
                status: verificationStatus.status,
                verificationId: dbUser.stripeIdentityVerificationId,
                redirectUrl: existingSession.url,
                message: `Continuing existing verification in status: ${verificationStatus.status}`,
              });
            }
          } catch (error) {
            console.error(`Error retrieving existing verification session URL: ${error}`);
            // Fall through to create a new session
          }
        }

        // For other states (canceled, etc), create a new session
        console.log(
          `Existing verification session is in status ${verificationStatus.status}, creating a new one`,
        );
      } catch (error) {
        console.error(`Error checking existing verification status: ${error}`);
        // If there was an error retrieving the status, we'll create a new session
      }
    }

    // Fallback rate limiting check (database-based) if Redis failed
    if (rateLimitResult.fallback && dbUser.stripeIdentityVerificationLastChecked) {
      const lastAttemptTime = new Date(dbUser.stripeIdentityVerificationLastChecked).getTime();
      const currentTime = Date.now();
      const timeSinceLastAttempt = currentTime - lastAttemptTime;

      if (timeSinceLastAttempt < RATE_LIMIT_COOLDOWN_MS) {
        const remainingCooldown = Math.ceil((RATE_LIMIT_COOLDOWN_MS - timeSinceLastAttempt) / 1000);
        console.log(
          `Database rate limit exceeded for user ${dbUser.id}. Cooldown remaining: ${remainingCooldown}s`,
        );

        return NextResponse.json(
          {
            error: `Too many verification attempts. Please try again in ${remainingCooldown} seconds.`,
            details: {
              reason: 'database_rate_limit',
              cooldownRemaining: remainingCooldown,
            },
          },
          { status: 429 },
        );
      }
    }

    // Record the rate limit attempt (for future checks)
    await recordRateLimitAttempts(user.id, clientIP);

    // Update the verification last checked timestamp (maintain existing behavior)
    await db
      .update(UsersTable)
      .set({
        stripeIdentityVerificationLastChecked: new Date(),
      })
      .where(eq(UsersTable.id, dbUser.id));

    // Create a new verification session
    const result = await createIdentityVerification(dbUser.id, user.id, user.email || dbUser.email);

    // Add rate limit info to successful responses
    const response = NextResponse.json(result);

    if (rateLimitResult.limits) {
      response.headers.set(
        'X-RateLimit-User-Remaining',
        rateLimitResult.limits.user.remaining.toString(),
      );
      response.headers.set(
        'X-RateLimit-IP-Remaining',
        rateLimitResult.limits.ip.remaining.toString(),
      );
      response.headers.set(
        'X-RateLimit-Global-Remaining',
        rateLimitResult.limits.global.remaining.toString(),
      );
    }

    return response;
  } catch (error) {
    console.error('Error creating identity verification:', error);
    return NextResponse.json({ error: 'Failed to create identity verification' }, { status: 500 });
  }
}
