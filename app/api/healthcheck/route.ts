import { NextResponse } from 'next/server';

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';
export const maxDuration = 60;

/**
 * Comprehensive health check endpoint that serves multiple purposes:
 * 1. CI/CD build verification and monitoring
 * 2. QStash service testing and validation
 * 3. System status monitoring
 *
 * Used by:
 * - GitHub Actions CI/CD for build verification
 * - QStash for testing message delivery
 * - Monitoring systems for service health
 * - Load balancers for health checks
 */
export async function GET(request: Request) {
  try {
    const isQStashRequest = request.headers.get('x-qstash-request') === 'true';
    const isCIRequest =
      request.headers.get('user-agent')?.includes('curl') ||
      request.headers.get('x-ci-check') === 'true';

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      source: isQStashRequest ? 'qstash' : isCIRequest ? 'ci-cd' : 'direct',
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.3.1',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        percentage: Math.round(
          (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        ),
      },
      // Additional system info for monitoring
      pid: process.pid,
      platform: process.platform,
      arch: process.arch,
    };

    return NextResponse.json(healthData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
      },
      { status: 500 },
    );
  }
}

/**
 * POST handler for receiving test messages from QStash
 * Also accepts health check probes from monitoring systems
 */
export async function POST(request: Request) {
  try {
    const isQStashRequest = request.headers.get('x-qstash-request') === 'true';
    const contentType = request.headers.get('content-type');
    let body = {};

    // Parse request body if present
    if (contentType?.includes('application/json')) {
      try {
        body = await request.json();
      } catch {
        // Ignore JSON parsing errors for non-JSON requests
      }
    }

    // Log QStash requests for debugging
    if (isQStashRequest) {
      console.log('QStash health check received:', {
        timestamp: new Date().toISOString(),
        body,
        headers: Object.fromEntries(request.headers.entries()),
      });
    }

    const responseData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      received: true,
      source: isQStashRequest ? 'qstash' : 'monitoring',
      body,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error in health check POST handler:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
