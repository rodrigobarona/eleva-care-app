/**
 * Derive a stable SHA-256 hex digest from a deterministic input string.
 *
 * Used to produce Stripe `Idempotency-Key` values that are the same for
 * a given booking/purchase context regardless of how many times the caller
 * invokes the underlying endpoint (prefetch, explicit submit, retries within
 * Stripe's 24h key retention window, or rapid double-clicks).
 *
 * Stripe treats matching keys as the same request and returns the same
 * Checkout Session, so duplicate in-flight calls collapse to a single
 * session instead of racing to create distinct ones.
 *
 * Single-sourced here so all client-side flows (meeting checkout, pack
 * purchase, etc.) share identical hashing/encoding behavior.
 */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
