import { Button } from '@/components/atoms/button';
import Link from 'next/link';
import type React from 'react';

const legalLinks = [
  { href: '/legal/terms', label: 'Terms of Service' },
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/cookie', label: 'Cookie Policy' },
  { href: '/legal/dpa', label: 'Data Processing Agreement' },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 pt-20">
        <nav className="mb-8 flex gap-4">
          {legalLinks.map((link) => (
            <Button key={link.href} variant="ghost" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
