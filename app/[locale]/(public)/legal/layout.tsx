'use client';

import type { ReactNode } from 'react';

/**
 * Provides a styled layout container for legal-related pages, centering and constraining the content.
 *
 * @param children - The content to display within the legal layout.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto py-8">
      <div className="prose mx-auto max-w-3xl">{children}</div>
    </div>
  );
}
