'use server';

import * as Sentry from '@sentry/nextjs';
import {
  CalendarService,
  isCalendarConnected,
  getPipesWidgetToken,
} from '@/lib/integrations/calendar';
import type { CalendarProvider } from '@/lib/integrations/calendar';
import { db } from '@/drizzle/db';
import {
  DestinationCalendarsTable,
  OrganizationsTable,
  UserOrgMembershipsTable,
} from '@/drizzle/schema';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { eq } from 'drizzle-orm';

const { logger } = Sentry;

async function getWorkosOrgId(workosUserId: string): Promise<string | null> {
  const membership = await db.query.UserOrgMembershipsTable.findFirst({
    where: eq(UserOrgMembershipsTable.workosUserId, workosUserId),
    columns: { orgId: true },
  });

  if (!membership?.orgId) return null;

  const org = await db.query.OrganizationsTable.findFirst({
    where: eq(OrganizationsTable.id, membership.orgId),
    columns: { workosOrgId: true },
  });

  return org?.workosOrgId ?? null;
}

export async function getCalendarConnectionStatus() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const orgId = await getWorkosOrgId(user.id);
  if (!orgId) return { google: false, outlook: false };

  const [google, outlook] = await Promise.all([
    isCalendarConnected('google-calendar', user.id, orgId),
    isCalendarConnected('microsoft-outlook-calendar', user.id, orgId),
  ]);
  return { google, outlook };
}

export async function fetchPipesWidgetToken() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const orgId = await getWorkosOrgId(user.id);
  if (!orgId) throw new Error('Organization not found');

  return getPipesWidgetToken(user.id, orgId);
}

export async function listAvailableCalendars() {
  const { user } = await withAuth({ ensureSignedIn: true });
  const orgId = await getWorkosOrgId(user.id);
  if (!orgId) return [];

  const [googleCals, outlookCals] = await Promise.all([
    CalendarService.listCalendars('google-calendar', user.id, orgId),
    CalendarService.listCalendars('microsoft-outlook-calendar', user.id, orgId),
  ]);

  return [...googleCals, ...outlookCals].filter((cal) => cal.writable);
}

export async function setDestinationCalendar(
  provider: CalendarProvider,
  externalId: string,
  name: string,
) {
  const { user } = await withAuth({ ensureSignedIn: true });

  await db
    .insert(DestinationCalendarsTable)
    .values({
      userId: user.id,
      provider,
      externalId,
      calendarName: name,
    })
    .onConflictDoUpdate({
      target: DestinationCalendarsTable.userId,
      set: {
        provider,
        externalId,
        calendarName: name,
        updatedAt: new Date(),
      },
    });

  logger.info('Destination calendar updated', {
    userId: user.id,
    provider,
    externalId,
  });
}

export async function getDestinationCalendar() {
  const { user } = await withAuth({ ensureSignedIn: true });

  return db.query.DestinationCalendarsTable.findFirst({
    where: eq(DestinationCalendarsTable.userId, user.id),
  });
}

export async function removeDestinationCalendar() {
  const { user } = await withAuth({ ensureSignedIn: true });

  await db
    .delete(DestinationCalendarsTable)
    .where(eq(DestinationCalendarsTable.userId, user.id));

  logger.info('Destination calendar removed', { userId: user.id });
}
