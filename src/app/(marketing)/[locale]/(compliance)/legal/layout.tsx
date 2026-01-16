import type { ReactNode } from 'react';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      {children}
    </div>
  );
}
