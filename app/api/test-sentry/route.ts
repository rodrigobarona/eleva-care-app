/**
 * Test API Route for Better Stack Error Tracking
 *
 * This route is used to test that server-side error tracking is working correctly.
 * It provides different error scenarios to verify the integration.
 *
 * Usage:
 * - GET /api/test-sentry - Throws a basic error
 * - GET /api/test-sentry?type=custom - Throws an error with custom context
 * - GET /api/test-sentry?type=async - Throws an async error
 *
 * @see /docs/09-integrations/betterstack-error-tracking.md
 */
import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const errorType = searchParams.get('type') || 'basic';

  try {
    switch (errorType) {
      case 'basic':
        // Basic error test
        throw new Error('Test server error from Better Stack integration (basic)');

      case 'custom':
        // Error with custom context
        Sentry.setTag('test_type', 'custom');
        Sentry.setContext('test_data', {
          timestamp: new Date().toISOString(),
          requestUrl: request.url,
          userAgent: request.headers.get('user-agent'),
        });
        throw new Error('Test server error with custom context');

      case 'async':
        // Async error test
        await new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Test async server error'));
          }, 100);
        });
        break;

      case 'handled':
        // Test captured exception (not thrown)
        Sentry.captureException(new Error('Test handled exception'), {
          level: 'warning',
          tags: {
            test_type: 'handled',
            manual: 'true',
          },
          extra: {
            message: 'This error was manually captured, not thrown',
          },
        });
        return NextResponse.json({
          success: true,
          message: 'Error captured (not thrown)',
        });

      default:
        return NextResponse.json(
          {
            error: 'Invalid error type',
            available: ['basic', 'custom', 'async', 'handled'],
          },
          { status: 400 },
        );
    }

    // This should never be reached (except for 'handled' case)
    return NextResponse.json({
      error: 'Error should have been thrown',
    });
  } catch (error) {
    // Re-throw to let Sentry catch it
    throw error;
  }
}
