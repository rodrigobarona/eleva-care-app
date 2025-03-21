import { isQStashAvailable, validateQStashConfig } from '@/lib/qstash-config';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * QStash health check endpoint
 * Verifies that QStash is properly configured and available
 */
export async function GET() {
  try {
    const config = validateQStashConfig();

    if (!config.isValid) {
      return NextResponse.json(
        {
          status: 'error',
          message: config.message,
          details: 'QStash is not properly configured with required environment variables',
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }

    const qstashAvailable = await isQStashAvailable();

    if (!qstashAvailable) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'QStash is not available',
          details: 'Failed to connect to QStash service or configuration is invalid',
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: 'ok',
      message: 'QStash is properly configured and available',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking QStash health:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to check QStash health',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
