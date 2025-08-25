import { ENV_CONFIG } from '@/config/env';
import { qstash } from '@/config/qstash';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

/**
 * Helper function to extract signature from various header formats
 * Handles both raw base64 strings and composite formats like "t=..., v1=..."
 * Also normalizes base64url to base64
 */
function extractSignatureFromHeader(headerValue: string): string | null {
  if (!headerValue) {
    return null;
  }

  // Trim whitespace
  const trimmed = headerValue.trim();

  // Check if this looks like a composite format (contains = and ,)
  if (trimmed.includes('=') && trimmed.includes(',')) {
    // Parse key=value pairs separated by commas or semicolons
    const pairs = trimmed.split(/[,;]/).map((pair) => pair.trim());
    const signatureMap = new Map<string, string>();

    for (const pair of pairs) {
      const [key, value] = pair.split('=').map((s) => s.trim());
      if (key && value) {
        signatureMap.set(key.toLowerCase(), value);
      }
    }

    // Try to find signature in order of preference: v1, signature, s, hmac
    const signatureKeys = ['v1', 'signature', 's', 'hmac'];
    for (const key of signatureKeys) {
      const signature = signatureMap.get(key);
      if (signature) {
        return normalizeBase64(signature);
      }
    }

    return null;
  } else {
    // Treat as raw signature string
    return normalizeBase64(trimmed);
  }
}

/**
 * Normalize base64url to base64 format
 * base64url uses - and _ instead of + and /, and omits padding
 */
function normalizeBase64(signature: string): string {
  if (!signature) {
    return signature;
  }

  // Convert base64url to base64
  let normalized = signature.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  const padding = normalized.length % 4;
  if (padding > 0) {
    normalized += '='.repeat(4 - padding);
  }

  return normalized;
}

/**
 * Validates Upstash QStash signature according to official documentation
 * Supports both current and next signing keys for key rotation
 */
export interface UpstashSignatureValidationResult {
  isValid: boolean;
  usedKey: 'current' | 'next' | null;
  error?: string;
}

/**
 * Extract and validate Upstash signature from request headers
 * Follows official QStash signature validation pattern
 */
export async function validateUpstashSignature(
  request: NextRequest,
  body: string = '',
): Promise<UpstashSignatureValidationResult> {
  try {
    // Extract signature from various possible headers
    const rawSignatureHeader =
      request.headers.get('Upstash-Signature') ||
      request.headers.get('upstash-signature') ||
      request.headers.get('x-upstash-signature');

    const signature = rawSignatureHeader ? extractSignatureFromHeader(rawSignatureHeader) : null;

    if (!signature) {
      return {
        isValid: false,
        usedKey: null,
        error: 'No Upstash signature found in request headers',
      };
    }

    // Get signing keys from environment
    const currentKey = ENV_CONFIG.QSTASH_CURRENT_SIGNING_KEY;
    const nextKey = ENV_CONFIG.QSTASH_NEXT_SIGNING_KEY;

    if (!currentKey && !nextKey) {
      return {
        isValid: false,
        usedKey: null,
        error: 'No QStash signing keys configured',
      };
    }

    // Create signature payload (URL + body)
    const url = request.nextUrl.toString();
    const sigPayload = url + body;

    // Try validation with current key first
    if (currentKey) {
      const isValidWithCurrent = await validateSignatureWithKey(signature, sigPayload, currentKey);
      if (isValidWithCurrent) {
        return {
          isValid: true,
          usedKey: 'current',
        };
      }
    }

    // Try validation with next key (for key rotation)
    if (nextKey && nextKey !== currentKey) {
      const isValidWithNext = await validateSignatureWithKey(signature, sigPayload, nextKey);
      if (isValidWithNext) {
        return {
          isValid: true,
          usedKey: 'next',
        };
      }
    }

    return {
      isValid: false,
      usedKey: null,
      error: 'Signature validation failed with both current and next keys',
    };
  } catch (error) {
    return {
      isValid: false,
      usedKey: null,
      error: `Signature validation error: ${error}`,
    };
  }
}

/**
 * Validate signature against a specific signing key
 */
async function validateSignatureWithKey(
  providedSignature: string,
  payload: string,
  signingKey: string,
): Promise<boolean> {
  try {
    // Create HMAC-SHA256 hash of the payload
    const expectedSignature = crypto
      .createHmac('sha256', signingKey)
      .update(payload, 'utf8')
      .digest('base64');

    // Convert signatures to buffers first
    const providedBuffer = Buffer.from(providedSignature, 'base64');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64');

    // Check buffer lengths before calling timingSafeEqual to prevent exceptions
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    // Compare signatures securely (timing attack resistant)
    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch (error) {
    console.error('Error validating signature with key:', error);
    return false;
  }
}

/**
 * Comprehensive QStash request validation
 * Combines signature validation with additional security checks
 */
export async function validateQStashRequest(
  request: NextRequest,
  body: string = '',
): Promise<{
  isValid: boolean;
  validationType: 'signature' | 'header' | 'user-agent' | 'api-key' | 'fallback' | null;
  details?: string;
}> {
  // 1. Primary: Validate Upstash signature
  const signatureResult = await validateUpstashSignature(request, body);
  if (signatureResult.isValid) {
    return {
      isValid: true,
      validationType: 'signature',
      details: `Validated with ${signatureResult.usedKey} signing key`,
    };
  }

  // 2. Fallback: Check for custom QStash header (legacy) - only when fallbackAuth is enabled
  if (qstash.security.fallbackAuth) {
    const hasQStashHeader = request.headers.get('x-qstash-request') === 'true';
    if (hasQStashHeader) {
      // Still validate user agent for additional security
      const userAgent = request.headers.get('user-agent') || '';
      const isUpstashUserAgent =
        userAgent.toLowerCase().includes('upstash') || userAgent.toLowerCase().includes('qstash');

      if (isUpstashUserAgent) {
        return {
          isValid: true,
          validationType: 'header',
          details: 'Validated via x-qstash-request header with Upstash user agent (fallback mode)',
        };
      }
    }
  }

  // 3. Development/Emergency fallback: API key
  const apiKey = request.headers.get('x-api-key');
  if (apiKey && apiKey === process.env.CRON_API_KEY) {
    return {
      isValid: true,
      validationType: 'api-key',
      details: 'Validated via emergency API key',
    };
  }

  // 4. User agent check (weakest security, for development)
  if (process.env.NODE_ENV !== 'production') {
    const userAgent = request.headers.get('user-agent') || '';
    const isUpstashUserAgent =
      userAgent.toLowerCase().includes('upstash') || userAgent.toLowerCase().includes('qstash');

    if (isUpstashUserAgent) {
      return {
        isValid: true,
        validationType: 'user-agent',
        details: 'Validated via user agent (development mode only)',
      };
    }
  }

  return {
    isValid: false,
    validationType: null,
    details: `Signature validation failed: ${signatureResult.error}`,
  };
}

/**
 * Middleware helper for QStash route protection
 * Returns appropriate response for invalid requests
 */
export function createQStashAuthResponse(validationResult: {
  isValid: boolean;
  validationType: string | null;
  details?: string;
}) {
  if (validationResult.isValid) {
    console.log(
      `✅ QStash request validated via ${validationResult.validationType}: ${validationResult.details}`,
    );
    return null; // Continue processing
  }

  console.error(`❌ QStash request validation failed: ${validationResult.details}`);
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      message: 'Invalid QStash signature or authentication',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    },
  );
}
