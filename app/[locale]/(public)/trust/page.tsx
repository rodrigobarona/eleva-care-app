import { isValidLocale } from '@/app/i18n';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    return {
      title: 'Eleva.care - Trust Center',
      description: 'Security, compliance, and trust information for Eleva.care',
    };
  }

  return {
    title: 'Eleva.care - Trust Center',
    description: 'Security, compliance, and trust information for Eleva.care',
    openGraph: {
      title: 'Eleva.care - Trust Center',
      description: 'Security, compliance, and trust information for Eleva.care',
      siteName: 'Eleva.care',
    },
  };
}

export default async function TrustPage({ params }: PageProps) {
  const { locale } = await params;

  // Handle invalid locale - redirect to default locale
  if (!isValidLocale(locale)) {
    redirect('/trust/security'); // Default locale (en) has no prefix
  }

  // Redirect to the default trust document (security)
  redirect(`/${locale}/trust/security`);
}
