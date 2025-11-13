'use client';

import type { ReactNode } from 'react';

export default function TrustLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto py-8">
      <div className="prose mx-auto max-w-3xl">{children}</div>
    </div>
  );
}
