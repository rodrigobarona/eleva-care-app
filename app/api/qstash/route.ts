import { validateQStashConfig } from '@/lib/qstash-config';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';
export const maxDuration = 60;

/**
 * Handle GET requests (not supported)
 */
export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint only accepts POST requests from QStash' },
    { status: 405 },
  );
}

/**
 * Processes and forwards a QStash POST request to a designated internal API endpoint.
 *
 * This function validates the QStash configuration and checks that the target endpoint,
 * provided via the "x-qstash-target-url" header, belongs to an allowed domain and follows one of the approved API paths.
 * It parses the request body (defaulting to an empty object if JSON parsing fails), logs the incoming request,
 * and generates a secure verification token using HMAC with the current timestamp and a signing key.
 * The token, along with appropriate headers (including an optional API key for cron endpoints), is then used to forward
 * the request via a POST call to the target endpoint. The JSON response from the endpoint is relayed back to the client.
 *
 * In cases of misconfiguration, missing or invalid target endpoints, or failed request forwarding,
 * an error response with the appropriate HTTP status code is returned.
 *
 * @remarks
 * Ensure that the necessary environment variables (e.g., QSTASH_CURRENT_SIGNING_KEY, NEXT_PUBLIC_APP_URL, CRON_API_KEY) are set.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  // Validate QStash configuration first
  const config = validateQStashConfig();
  if (!config.isValid) {
    console.error('QStash is not properly configured for signature verification');
    return NextResponse.json(
      {
        error: 'QStash is not properly configured',
        details: 'Missing environment variables for QStash verification',
      },
      { status: 500 },
    );
  }

  // Get the target endpoint from the request
  const targetEndpoint = req.headers.get('x-qstash-target-url');
  if (!targetEndpoint) {
    console.error('Missing target endpoint in QStash request');
    return NextResponse.json({ error: 'Missing target endpoint' }, { status: 400 });
  }

  // Validate the target endpoint
  try {
    const url = new URL(targetEndpoint);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    // Get allowed domains (the app's domain and additional trusted domains if needed)
    const allowedDomains = [new URL(appUrl || '').hostname, 'localhost'].filter(Boolean);

    // Get allowed paths (only API endpoints with specific prefixes)
    const allowedPathPrefixes = ['/api/cron/', '/api/admin/', '/api/webhooks/'];

    // Validate domain
    if (!allowedDomains.includes(url.hostname)) {
      console.error(`Blocked request to untrusted domain: ${url.hostname}`);
      return NextResponse.json({ error: 'Target endpoint domain not allowed' }, { status: 403 });
    }

    // Validate path
    const isAllowedPath = allowedPathPrefixes.some((prefix) => url.pathname.startsWith(prefix));
    if (!isAllowedPath) {
      console.error(`Blocked request to untrusted path: ${url.pathname}`);
      return NextResponse.json({ error: 'Target endpoint path not allowed' }, { status: 403 });
    }

    try {
      // Parse the body
      let body: Record<string, unknown> = {};
      try {
        body = await req.json();
      } catch {
        // If JSON parsing fails, use an empty object
        // body is already initialized as an empty object
      }

      // Log the incoming request
      console.log(`QStash forwarding request to ${targetEndpoint}`, {
        body,
        headers: Object.fromEntries(req.headers.entries()),
      });

      // Generate a secure verification token for internal use
      // This token contains a timestamp and HMAC signature to prevent spoofing
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const hmac = crypto.createHmac('sha256', process.env.QSTASH_CURRENT_SIGNING_KEY || '');
      hmac.update(timestamp);
      const signature = hmac.digest('hex');
      const verificationToken = `${timestamp}.${signature}`;

      // Forward the request to the target endpoint
      const response = await fetch(new URL(targetEndpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-qstash-request': 'true',
          'x-internal-qstash-verification': verificationToken,
          // Add API key header for cron endpoints as a backup authentication method
          ...(targetEndpoint.includes('/api/cron/') && process.env.CRON_API_KEY
            ? { 'x-api-key': process.env.CRON_API_KEY }
            : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error forwarding request to ${targetEndpoint}:`, errorText);
        return NextResponse.json(
          { error: `Target endpoint returned ${response.status}: ${errorText}` },
          { status: response.status },
        );
      }

      const responseData = await response.json();
      return NextResponse.json(responseData);
    } catch (error: unknown) {
      console.error('Error processing QStash request:', error);
      return NextResponse.json(
        { error: 'Internal server error processing QStash request' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Invalid target URL:', targetEndpoint, error);
    return NextResponse.json({ error: 'Invalid target URL' }, { status: 400 });
  }
}

// Define a type for our handler function
type QStashHandler = (req: NextRequest) => Promise<NextResponse>;

// Only apply signature verification if configuration is valid
const config = validateQStashConfig();
let POST: QStashHandler;

if (config.isValid) {
  // Export the handler wrapped with signature verification
  POST = verifySignatureAppRouter(handler) as QStashHandler;
} else {
  // Fallback handler that returns an error
  POST = async () => {
    return NextResponse.json(
      {
        error: 'QStash is not properly configured',
        details: 'Missing environment variables for QStash verification',
      },
      { status: 500 },
    );
  };
}

// Export the POST handler
export { POST };
