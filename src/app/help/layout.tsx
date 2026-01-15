import * as Sentry from '@sentry/nextjs';
import Footer from '@/components/layout/footer/Footer';
import Header from '@/components/layout/header/Header';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';
import { getFumadocsLocale } from '@/lib/fumadocs-i18n';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { DocsProvider } from '../../components/providers/help-provider';
// Import Fumadocs styles
import './docs.css';

/**
 * Documentation Root Layout
 *
 * This layout wraps all documentation pages with:
 * - Marketing Header and Footer for consistent navigation
 * - NextIntlClientProvider for i18n support (required since docs is outside [locale])
 * - Fumadocs DocsProvider for UI components and custom search
 * - SmoothScrollProvider for consistent scroll behavior
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
      <SmoothScrollProvider>
        <div id="eleva-care-help" className="relative flex min-h-screen flex-col overflow-hidden">
          <Header />
          {/* pt-20 (mobile) / pt-24 (lg) to account for fixed header height */}
          <DocsProvider locale={locale}>
            <main className="mx-auto w-full max-w-7xl flex-1 pt-20 lg:pt-24">{children}</main>
          </DocsProvider>
          <Footer />
        </div>
      </SmoothScrollProvider>
    </NextIntlClientProvider>
  );
}
