import { getCachedUserByUsername } from '@/lib/cache/clerk-cache';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Resolves the username BEFORE anything is streamed, so unknown profiles
 * (/{typo}, /help, ...) return a real HTTP 404 to browsers and crawlers.
 *
 * This works because no Suspense boundary sits above this layout: the profile
 * skeleton (./loading.tsx) wraps only the page below it. Do not add a
 * loading.tsx to app/[locale]/(public)/ or the 200 status would be flushed
 * before this check runs. The lookup is React-cached, so the page's own
 * ProfileAccessControl reuses it within the same request. Published/owner
 * access is still enforced by ProfileAccessControl in the pages.
 */
export default async function UsernameLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  setRequestLocale(locale);

  const user = await getCachedUserByUsername(username);
  if (!user) {
    notFound();
  }

  return children;
}
