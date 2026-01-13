import { RootProvider } from 'fumadocs-ui/provider';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import './docs.css';

/**
 * Inter font for documentation pages
 * Uses variable font for optimal performance
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

/**
 * Documentation Layout
 *
 * This layout wraps all documentation pages with:
 * - Fumadocs RootProvider for UI components
 * - Theme support (light/dark mode)
 * - Search functionality
 *
 * @see https://fumadocs.vercel.app/docs/ui/layouts
 */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
