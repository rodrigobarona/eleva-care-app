import Footer from '@/components/layout/footer/Footer';
import Header from '@/components/layout/header/Header';
import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

export default async function PublicLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Footer (and its ServerStatus) use next-intl on the server. Layouts and pages
  // render concurrently, so this layout must set the request locale itself;
  // otherwise next-intl falls back to headers(), which makes every public page
  // dynamic (no ISR). The locale is validated by app/[locale]/layout.tsx.
  setRequestLocale(locale);

  return (
    <div className="relative overflow-hidden">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
