'use client';

import { ServiceIcons } from '@/lib/icons/ServiceIcons';

/**
 * Client wrapper so the (server) Services section can render icons from the
 * 'use client' ServiceIcons map, whose functions can't be called from an RSC.
 */
export function ServiceIcon({ name }: { name: string }) {
  return ServiceIcons[name as keyof typeof ServiceIcons]?.() ?? null;
}
