// Example: Updating a cron endpoint to use enhanced QStash signature validation
// File: app/api/cron/example/route.ts
import { createQStashAuthResponse, validateQStashRequest } from '@/lib/qstash-signature-validator';
import { NextRequest } from 'next/server';

/**
 * 🔒 BEFORE: Weak security with just header checking
 */
export async function POST_OLD(request: NextRequest) {
  // ❌ Vulnerable: Only checks custom header (can be spoofed)
  const isQStashRequest = request.headers.get('x-qstash-request') === 'true';
  const userAgent = request.headers.get('user-agent') || '';
  const isUpstashUA = userAgent.toLowerCase().includes('upstash');

  if (!isQStashRequest || !isUpstashUA) {
    return new Response('Unauthorized', { status: 401 });
  }

  // ⚠️ Proceed without cryptographic verification
  return await processCronJob();
}

/**
 * 🛡️ AFTER: Strong security with cryptographic signature validation
 */
export async function POST(request: NextRequest) {
  try {
    // 🔐 Get request body for signature validation (required)
    const body = await request.text();

    // ✅ Comprehensive validation with multiple security layers
    const validationResult = await validateQStashRequest(request, body);

    // 🚫 Return appropriate error response if validation fails
    const authResponse = createQStashAuthResponse(validationResult);
    if (authResponse) return authResponse;

    // ✅ Request is cryptographically validated - safe to proceed
    console.log(`🔒 QStash request validated via ${validationResult.validationType}`);

    // Parse the body if needed (since we already read it)
    const data = body ? JSON.parse(body) : {};

    return await processCronJob(data);
  } catch (error) {
    console.error('❌ Cron job error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', timestamp: new Date().toISOString() }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

async function processCronJob(_data?: Record<string, unknown>) {
  // Your cron job logic here
  console.log('✅ Processing secure cron job...');

  // Simulate work
  await new Promise((resolve) => setTimeout(resolve, 100));

  return new Response(
    JSON.stringify({
      success: true,
      processed: true,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

/**
 * 🎯 ALTERNATIVE: Granular signature-only validation
 * Use this when you only want cryptographic validation (no fallbacks)
 */
export async function POST_SIGNATURE_ONLY(request: NextRequest) {
  try {
    const body = await request.text();

    // Only validate Upstash signature (strictest security)
    const { validateUpstashSignature } = await import('@/lib/qstash-signature-validator');
    const signatureResult = await validateUpstashSignature(request, body);

    if (!signatureResult.isValid) {
      console.error(`🚫 Signature validation failed: ${signatureResult.error}`);
      return new Response('Invalid signature', { status: 401 });
    }

    console.log(`🔐 Validated with ${signatureResult.usedKey} signing key`);

    return await processCronJob(body ? JSON.parse(body) : undefined);
  } catch (error) {
    console.error('❌ Signature validation error:', error);
    return new Response('Authentication failed', { status: 401 });
  }
}

/**
 * 🧪 TESTING: Example test for the enhanced validation
 */
export const testExample = {
  // Test with valid signature
  validRequest: {
    url: 'https://example.com/api/cron/test',
    headers: {
      'Upstash-Signature': 'dGVzdF9zaWduYXR1cmU=', // Base64 encoded signature
      'user-agent': 'QStash/1.0',
      'content-type': 'application/json',
    },
    body: '{"test": true}',
  },

  // Test with missing signature (should use fallback)
  fallbackRequest: {
    url: 'https://example.com/api/cron/test',
    headers: {
      'x-qstash-request': 'true',
      'user-agent': 'QStash/1.0',
    },
  },

  // Test with invalid signature (should fail)
  invalidRequest: {
    url: 'https://example.com/api/cron/test',
    headers: {
      'Upstash-Signature': 'invalid_signature',
      'user-agent': 'QStash/1.0',
    },
  },
};

/**
 * 📊 MONITORING: Enhanced logging for security analysis
 * (Commented out to avoid unused function warning - use in actual implementation)
 */
/*
function logSecurityEvent(validationType: string, success: boolean, details?: string) {
  const securityLog = {
    timestamp: new Date().toISOString(),
    event: 'qstash_validation',
    validationType,
    success,
    details,
    environment: process.env.NODE_ENV,
  };

  if (success) {
    console.log('🛡️ Security validation success:', securityLog);
  } else {
    console.warn('🚨 Security validation failure:', securityLog);
  }

  // In production, you might send this to your monitoring system
  // await sendToMonitoring(securityLog);
}
*/
