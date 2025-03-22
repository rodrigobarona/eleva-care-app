import { NextResponse } from 'next/server';

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';
export const maxDuration = 60;

/**
 * General health check endpoint that returns the current status of the API
 * Can be used to verify that the server is up and running
 * Also used as a target for QStash test messages
 */
export async function GET(request: Request) {
  const isQStashRequest = request.headers.get('x-qstash-request') === 'true';

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    source: isQStashRequest ? 'qstash' : 'direct',
    uptime: process.uptime(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'unknown',
  });
}

/**
 * POST handler for receiving test messages from QStash
 */
export async function POST(request: Request) {
  try {
    const isQStashRequest = request.headers.get('x-qstash-request') === 'true';
    let body = {};

    try {
      body = await request.json();
    } catch {
      // Ignore JSON parsing errors
    }

    console.log('Healthcheck received POST request', {
      isQStashRequest,
      body,
      headers: Object.fromEntries(request.headers.entries()),
    });

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      received: true,
      source: isQStashRequest ? 'qstash' : 'direct',
      body,
    });
  } catch (error) {
    console.error('Error in healthcheck POST handler:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
