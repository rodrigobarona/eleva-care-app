'use server';

import * as Sentry from '@sentry/nextjs';
import { workos } from '@/lib/integrations/workos/client';
import { redisManager } from '@/lib/redis';

const { logger } = Sentry;

const GUEST_CACHE_PREFIX = 'guest-info:';
const CACHE_TTL_SECONDS = 3600; // 1 hour

export interface GuestInfo {
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

const FALLBACK_GUEST: GuestInfo = {
  email: '',
  firstName: 'Guest',
  lastName: '',
  fullName: 'Guest',
};

/**
 * Resolve guest name and email from WorkOS by user ID, with Redis caching.
 *
 * Used across the app to replace direct DB reads of guestEmail/guestName.
 * Caches results for 1 hour to minimize WorkOS API calls.
 */
export async function resolveGuestInfo(workosUserId: string): Promise<GuestInfo> {
  if (!workosUserId) return FALLBACK_GUEST;

  const cacheKey = GUEST_CACHE_PREFIX + workosUserId;

  try {
    const cached = await redisManager.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as GuestInfo;
    }
  } catch {
    logger.warn('Failed to read guest info cache', { workosUserId });
  }

  try {
    const user = await workos.userManagement.getUser(workosUserId);
    const info: GuestInfo = {
      email: user.email,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      fullName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
    };

    try {
      await redisManager.set(cacheKey, JSON.stringify(info), CACHE_TTL_SECONDS);
    } catch {
      logger.warn('Failed to cache guest info', { workosUserId });
    }

    return info;
  } catch (error) {
    logger.error('Failed to resolve guest info from WorkOS', {
      workosUserId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return FALLBACK_GUEST;
  }
}

/**
 * Batch-resolve guest info for multiple WorkOS user IDs.
 *
 * Checks cache first, then fetches uncached users individually.
 * Returns a Map keyed by workosUserId.
 */
export async function resolveGuestInfoBatch(
  workosUserIds: string[],
): Promise<Map<string, GuestInfo>> {
  const result = new Map<string, GuestInfo>();
  const uncachedIds: string[] = [];

  // Check cache for each ID
  for (const id of workosUserIds) {
    if (!id) continue;
    const cacheKey = GUEST_CACHE_PREFIX + id;
    try {
      const cached = await redisManager.get(cacheKey);
      if (cached) {
        result.set(id, JSON.parse(cached) as GuestInfo);
        continue;
      }
    } catch {
      // Fall through to uncached
    }
    uncachedIds.push(id);
  }

  // Fetch uncached IDs in parallel (bounded to avoid rate limiting)
  const BATCH_SIZE = 10;
  for (let i = 0; i < uncachedIds.length; i += BATCH_SIZE) {
    const batch = uncachedIds.slice(i, i + BATCH_SIZE);
    const fetched = await Promise.allSettled(
      batch.map(async (id) => {
        const info = await resolveGuestInfo(id);
        return { id, info };
      }),
    );

    for (const entry of fetched) {
      if (entry.status === 'fulfilled') {
        result.set(entry.value.id, entry.value.info);
      }
    }
  }

  return result;
}
