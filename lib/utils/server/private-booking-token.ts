import { ENV_CONFIG } from '@/config/env';
import crypto from 'node:crypto';
import 'server-only';

/**
 * @fileoverview Stateless, HMAC-signed "private booking link" tokens.
 *
 * An expert can share a link that lets a single customer book one exact
 * date/time, even when that slot falls outside the expert's normal
 * availability (weekly schedule, blocked dates, minimum notice) and even for
 * inactive events. The token carries the slot and is verified server-side
 * before any availability bypass is applied.
 *
 * The secret is `PRIVATE_BOOKING_LINK_SECRET`, falling back to
 * `CLERK_SECRET_KEY` so the feature works without extra configuration while
 * remaining overridable in production.
 */

const SECRET = ENV_CONFIG.PRIVATE_BOOKING_LINK_SECRET || ENV_CONFIG.CLERK_SECRET_KEY;

export interface PrivateBookingTokenPayload {
  /** UUID of the event the slot belongs to. */
  eventId: string;
  /** Clerk user id of the expert who owns the event. */
  clerkUserId: string;
  /** Exact slot start time as an ISO-8601 UTC string. */
  startTime: string;
  /** Expiry as Unix epoch seconds. */
  exp: number;
  /** Optional lock so only this guest email can use the link. */
  guestEmail?: string;
}

function sign(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

/**
 * Creates a signed private-booking token. Throws if no signing secret is
 * configured to avoid issuing forgeable tokens.
 */
export function createPrivateBookingToken(payload: PrivateBookingTokenPayload): string {
  if (!SECRET) {
    throw new Error(
      'Cannot create private booking token: PRIVATE_BOOKING_LINK_SECRET (or CLERK_SECRET_KEY) is not configured',
    );
  }

  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/**
 * Verifies a private-booking token. Returns the payload when the signature is
 * valid and the token has not expired, otherwise `null`.
 */
export function verifyPrivateBookingToken(
  token: string | null | undefined,
): PrivateBookingTokenPayload | null {
  if (!token || !SECRET) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [body, signature] = parts;
  const expectedSignature = sign(body);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as PrivateBookingTokenPayload;

    if (
      !payload?.eventId ||
      !payload?.clerkUserId ||
      !payload?.startTime ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }

    if (Date.now() / 1000 > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}
