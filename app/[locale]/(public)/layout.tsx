'use client';

import Footer from '@/components/organisms/Footer';
import Header from '@/components/organisms/Header';
import type { ReactNode } from 'react';

/**
 * Provides a public-facing layout with a header, footer, and main content area.
 *
 * Renders the {@link Header} component at the top, the supplied {@link children} content in the middle, and the {@link Footer} component at the bottom within a styled container.
 *
 * @param children - The main content to display between the header and footer.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
