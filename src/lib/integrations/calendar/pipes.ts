'use server';

import * as Sentry from '@sentry/nextjs';
import { workos } from '@/lib/integrations/workos/client';
import type { CalendarProvider } from './types';

const { logger } = Sentry;

/**
 * Fetch an OAuth access token for a calendar provider via WorkOS Pipes.
 * Returns `null` when the user has not connected the provider.
 */
export async function getCalendarToken(
  provider: CalendarProvider,
  userId: string,
  organizationId: string,
): Promise<string | null> {
  try {
    const result = await workos.pipes.getAccessToken({
      provider,
      userId,
      organizationId,
    });

    if (!result.active) {
      logger.debug(
        logger.fmt`Calendar provider ${provider} not connected for user ${userId}: ${result.error}`,
      );
      return null;
    }

    return result.accessToken.accessToken;
  } catch (error) {
    logger.error('Failed to fetch calendar token from Pipes', {
      provider,
      userId,
      error,
    });
    return null;
  }
}

export async function isCalendarConnected(
  provider: CalendarProvider,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const token = await getCalendarToken(provider, userId, organizationId);
  return token !== null;
}

/**
 * Generate a short-lived widget token for the Pipes Widget UI.
 */
export async function getPipesWidgetToken(
  userId: string,
  organizationId: string,
): Promise<string> {
  const { token } = await workos.widgets.getToken({
    organizationId,
    userId,
    scopes: ['widgets:pipes:manage'],
  });
  return token;
}
