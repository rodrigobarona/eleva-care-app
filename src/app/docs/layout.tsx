import * as Sentry from '@sentry/nextjs';
import type { ReactNode } from 'react';

import { DocsProvider } from './components/docs-provider';
// Import Fumadocs styles
import './docs.css';

/**
 * Documentation Root Layout
 *
 * This layout wraps all documentation pages with:
 * - Fumadocs DocsProvider for UI components and custom search
 * - Sentry context for documentation-specific tracking
 * - Theme support (light/dark mode)
 * - Search functionality with portal tag filtering
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
export default function DocsLayout({ children }: { children: ReactNode }) {
  // Set Sentry context for documentation pages
  // This helps filter and categorize errors from docs vs other parts of the app
  Sentry.setTag('section', 'documentation');
  Sentry.setContext('documentation', {
    type: 'fumadocs',
    version: '1.0.0',
  });

  // Add navigation breadcrumb when entering docs section
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: 'Entered documentation section',
    level: 'info',
  });

  return <DocsProvider>{children}</DocsProvider>;
}
