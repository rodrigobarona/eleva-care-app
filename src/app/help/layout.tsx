import * as Sentry from '@sentry/nextjs';
import { getFumadocsLocale } from '@/lib/fumadocs-i18n';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { DocsProvider } from './components/docs-provider';
// Import Fumadocs styles
import './docs.css';

/**
 * Documentation Root Layout
 *
 * This layout wraps all documentation pages with:
 * - NextIntlClientProvider for i18n support (required since docs is outside [locale])
 * - Fumadocs DocsProvider for UI components and custom search
 * - Sentry context for documentation-specific tracking
 * - Theme support (light/dark mode)
 * - Search functionality with portal tag filtering
 *
 * Locale Detection:
 * - Uses getFumadocsLocale() which reads from FUMADOCS_LOCALE cookie
 * - Cookie is set by proxy.ts when rewriting /pt/help/* → /help/*
 * - Falls back to NEXT_LOCALE cookie or 'en' default
 * - setRequestLocale() is called to enable next-intl server functions
 *
 * Sentry Integration:
 * - Sets 'section' tag to 'documentation' for filtering in Sentry
 * - Adds breadcrumb for documentation section entry
 * - Inherits Analytics and SpeedInsights from root layout
 *
 * Note: This layout is nested inside the root layout, so it should NOT
 * include <html> or <body> tags.
 *
 * @see https://fumadocs.vercel.app/docs/ui/layouts
 * @see https://docs.sentry.io/platforms/javascript/enriching-events/context/
 */
export default async function DocsLayout({ children }: { children: ReactNode }) {
  // Get locale from Fumadocs detection (cookie/header based)
  const locale = await getFumadocsLocale();

  // CRITICAL: Set the request locale for next-intl server functions
  // This must be called before getMessages() to establish locale context
  setRequestLocale(locale);

  // Get messages for the locale (for any next-intl components used in docs)
  const messages = await getMessages();

  // Set Sentry context for documentation pages
  // This helps filter and categorize errors from docs vs other parts of the app
  Sentry.setTag('section', 'documentation');
  Sentry.setTag('docs.locale', locale);
  Sentry.setContext('documentation', {
    type: 'fumadocs',
    version: '1.0.0',
    locale,
  });

  // Add navigation breadcrumb when entering docs section
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Entered documentation section (locale: ${locale})`,
    level: 'info',
  });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DocsProvider locale={locale}>{children}</DocsProvider>
    </NextIntlClientProvider>
  );
}
