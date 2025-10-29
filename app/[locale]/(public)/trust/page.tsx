import { isValidLocale } from '@/app/i18n';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ locale: string }>;
}

// Static metadata since this page is just a redirect
export const metadata: Metadata = {
  title: 'Eleva.care - Trust Center',
  description: 'Security, compliance, and trust information for Eleva.care',
  openGraph: {
    title: 'Eleva.care - Trust Center',
    description: 'Security, compliance, and trust information for Eleva.care',
    siteName: 'Eleva.care',
  },
};

export default async function TrustPage({ params }: PageProps) {
  const { locale } = await params;

  // Handle invalid locale - redirect to default locale
  if (!isValidLocale(locale)) {
    redirect('/trust/security'); // Default locale (en) has no prefix
  }

  // Redirect to the default trust document (security)
  redirect(`/${locale}/trust/security`);
}
