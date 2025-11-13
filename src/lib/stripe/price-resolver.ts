/**
 * Stripe Price Resolver
 *
 * Dynamically resolves Stripe prices using lookup keys.
 * Caches results for performance.
 */
import Stripe from 'stripe';

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
  typescript: true,
});

/**
 * In-memory cache for price lookups
 * Cache duration: 5 minutes (prices rarely change)
 */
const priceCache = new Map<
  string,
  {
    price: Stripe.Price;
    timestamp: number;
  }
>();

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Resolve a Stripe Price by lookup key
 *
 * @param lookupKey - The lookup key (e.g., 'community-expert-monthly')
 * @param useCache - Whether to use cache (default: true)
 * @returns Stripe.Price object or null if not found
 *
 * @example
 * const price = await resolvePriceByLookupKey('community-expert-monthly');
 * if (price) {
 *   console.log(`Price: ${price.unit_amount / 100}`);
 * }
 */
export async function resolvePriceByLookupKey(
  lookupKey: string,
  useCache: boolean = true,
): Promise<Stripe.Price | null> {
  // Check cache first
  if (useCache) {
    const cached = priceCache.get(lookupKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      console.log(`[Price Resolver] Cache hit for ${lookupKey}`);
      return cached.price;
    }
  }

  try {
    console.log(`[Price Resolver] Fetching price for lookup key: ${lookupKey}`);

    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      expand: ['data.product'],
      limit: 1,
    });

    if (prices.data.length === 0) {
      console.warn(`[Price Resolver] No active price found for lookup key: ${lookupKey}`);
      return null;
    }

    const price = prices.data[0];

    // Update cache
    priceCache.set(lookupKey, {
      price,
      timestamp: Date.now(),
    });

    return price;
  } catch (error) {
    console.error(`[Price Resolver] Error fetching price for ${lookupKey}:`, error);
    return null;
  }
}

/**
 * Resolve multiple prices by lookup keys in parallel
 *
 * @param lookupKeys - Array of lookup keys
 * @returns Map of lookup key to Price object
 *
 * @example
 * const prices = await resolvePricesByLookupKeys([
 *   'community-expert-monthly',
 *   'top-expert-monthly',
 * ]);
 * prices.forEach((price, key) => {
 *   console.log(`${key}: $${price.unit_amount / 100}`);
 * });
 */
export async function resolvePricesByLookupKeys(
  lookupKeys: string[],
): Promise<Map<string, Stripe.Price>> {
  const results = await Promise.all(lookupKeys.map((key) => resolvePriceByLookupKey(key)));

  const priceMap = new Map<string, Stripe.Price>();

  lookupKeys.forEach((key, index) => {
    const price = results[index];
    if (price) {
      priceMap.set(key, price);
    }
  });

  return priceMap;
}

/**
 * Get price ID from lookup key
 * Convenience method that returns just the ID
 *
 * @param lookupKey - The lookup key
 * @returns Price ID (e.g., 'price_xxx') or null
 *
 * @example
 * const priceId = await getPriceIdByLookupKey('community-expert-monthly');
 * // Returns: 'price_1SQbV5K5Ap4Um3SpD65qOwZB'
 */
export async function getPriceIdByLookupKey(lookupKey: string): Promise<string | null> {
  const price = await resolvePriceByLookupKey(lookupKey);
  return price?.id || null;
}

/**
 * Clear the price cache
 * Useful for testing or forcing fresh data
 */
export function clearPriceCache(): void {
  priceCache.clear();
  console.log('[Price Resolver] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
} {
  return {
    size: priceCache.size,
    keys: Array.from(priceCache.keys()),
  };
}

