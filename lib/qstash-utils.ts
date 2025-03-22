import crypto from 'node:crypto';

import { validateQStashConfig } from './qstash-config';

/**
 * Verify that a request genuinely came from QStash and was properly verified
 * by our signature verification middleware
 *
 * @param headers - Request headers
 * @returns Boolean indicating if the request is a verified QStash request
 */
export async function isVerifiedQStashRequest(headers: Headers): Promise<boolean> {
  const config = validateQStashConfig();
  if (!config.isValid) {
    console.error('QStash configuration is invalid for verification');
    return false;
  }

  // Check for QStash request header
  const isQStashRequest = headers.get('x-qstash-request') === 'true';
  if (!isQStashRequest) {
    return false;
  }

  // Check for internal verification token
  const verificationToken = headers.get('x-internal-qstash-verification');
  if (!verificationToken) {
    console.warn('Missing QStash internal verification token');
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

    // Check if the token is too old (10 minutes max)
    const tokenTime = Number.parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - tokenTime > 600) {
      // 10 minutes
      console.warn('QStash verification token expired');
      return false;
    }

    // Verify HMAC signature
    const hmac = crypto.createHmac('sha256', currentKey);
    hmac.update(timestamp);
    const expectedSignature = hmac.digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  } catch (error) {
    console.error('Error verifying QStash token:', error);
    return false;
  }
}
