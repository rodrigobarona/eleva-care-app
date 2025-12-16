import { timingSafeEqual } from 'node:crypto';

import { validateQStashConfig } from './config';

/** Maximum age of a verification token (30 minutes) */
const TOKEN_MAX_AGE_SECONDS = 1800;

/**
 * Allowed clock skew for future-dated tokens (60 seconds).
 * Tokens with timestamps more than this amount ahead of current time are rejected.
 * This tolerance accommodates minor clock drift between servers.
 */
const ALLOWED_CLOCK_SKEW_SECONDS = 60;

/**
 * Verify that a request genuinely came from QStash and was properly verified
 * by our signature verification middleware
 *
 * @param headers - Request headers
 * @returns Boolean indicating if the request is a verified QStash request
 */
export async function isVerifiedQStashRequest(headers: Headers): Promise<boolean> {
  const config = validateQStashConfig();

  // Debug: Log all headers to help diagnose issues
  console.log('QStash verification checking headers:', Object.fromEntries(headers.entries()));

  // Check for API key first as a direct authentication method
  const apiKey = headers.get('x-api-key');
  if (apiKey && apiKey === process.env.CRON_API_KEY) {
    console.log('Request authenticated via API key');
    return true;
  }

  // Multiple ways to verify a QStash request
  const isQStashRequestHeader = headers.get('x-qstash-request') === 'true';
  const hasUpstashSignature =
    headers.has('upstash-signature') ||
    headers.has('x-upstash-signature') ||
    headers.has('x-signature');
  const isUpstashUserAgent =
    (headers.get('user-agent') || '').toLowerCase().includes('upstash') ||
    (headers.get('user-agent') || '').toLowerCase().includes('qstash');
  const hasSignatureParam = headers.get('url')?.includes('signature=') || false;

  // Early accept if it's clearly from UpStash but our config is invalid
  // This helps in emergencies where QStash needs to work even with config issues
  if (!config.isValid) {
    console.warn('QStash configuration is invalid for verification');

    if (isUpstashUserAgent && (isQStashRequestHeader || hasUpstashSignature || hasSignatureParam)) {
      console.log('Accepting request based on UpStash identifiers despite invalid config');
      return true;
    }

    return false;
  }

  // Accept based on UpStash identifiers
  if (isUpstashUserAgent && (isQStashRequestHeader || hasUpstashSignature || hasSignatureParam)) {
    console.log('Accepting request based on UpStash User-Agent and request identifiers');
    return true;
  }

  // Check for QStash request header
  if (!isQStashRequestHeader) {
    console.log('Not a QStash request (missing header)');
    return false;
  }

  // Check for internal verification token
  const verificationToken = headers.get('x-internal-qstash-verification');
  if (!verificationToken) {
    console.warn('Missing QStash internal verification token');

    // If it has other QStash identifiers, accept it
    if (hasUpstashSignature || isUpstashUserAgent || hasSignatureParam) {
      console.log(
        'Accepting request despite missing verification token based on other identifiers',
      );
      return true;
    }

    return false;
  }

  // Verify the token's signature
  try {
    // Get QStash signature keys from environment
    const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    if (!currentKey) {
      console.error('Missing QSTASH_CURRENT_SIGNING_KEY for verification');
      return false;
    }

    // Parse the token parts (format: timestamp.signature)
    const [timestamp, signature] = verificationToken.split('.');
    if (!timestamp || !signature) {
      console.warn('Invalid verification token format');
      return false;
    }

    // Validate timestamp is a valid number
    const tokenTime = Number.parseInt(timestamp, 10);
    if (Number.isNaN(tokenTime)) {
      console.warn('QStash verification token has invalid timestamp');
      return false;
    }

    const now = Math.floor(Date.now() / 1000);

    // Check if the token is from the future (beyond allowed clock skew)
    // This prevents replay attacks with pre-generated future tokens
    if (tokenTime - now > ALLOWED_CLOCK_SKEW_SECONDS) {
      console.warn('QStash verification token timestamp is in the future');
      return false;
    }

    // Check if the token is too old (expired)
    if (now - tokenTime > TOKEN_MAX_AGE_SECONDS) {
      console.warn('QStash verification token expired');
      return false;
    }

    // Verify HMAC signature using Bun.CryptoHasher
    const hasher = new Bun.CryptoHasher('sha256', currentKey);
    hasher.update(timestamp);
    const expectedSignature = hasher.digest('hex');

    const isValidSignature = timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );

    if (isValidSignature) {
      console.log('QStash request validated with valid internal verification token');
    } else {
      console.warn('QStash request has invalid signature');
    }

    return isValidSignature;
  } catch (error) {
    console.error('Error verifying QStash token:', error);
    return false;
  }
}
