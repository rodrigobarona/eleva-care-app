import { isValidLocale } from '@/app/i18n';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function TrustPage({ params }: PageProps) {
  const { locale } = await params;

  // Handle invalid locale - redirect to default locale
  if (!isValidLocale(locale)) {
    redirect('/trust/security'); // Default locale (en) has no prefix
  }

  // Must run before any next-intl API in this segment: without it next-intl reads
  // the locale from headers(), which silently makes the route dynamic (no ISR).
  setRequestLocale(locale);

  // Redirect to the default trust document (security)
  redirect(`/${locale}/trust/security`);
}
