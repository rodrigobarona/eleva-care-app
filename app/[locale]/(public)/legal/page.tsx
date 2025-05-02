import { isValidLocale } from '@/app/i18n';
import { Link } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  // Await params before using locale
  const { locale } = await params;

  // Validate locale before proceeding
  if (!isValidLocale(locale)) {
    console.error(`Invalid locale in Legal page metadata: ${locale}`);
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'Legal' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

// Separate component that uses hooks
function LegalContent() {
  const t = useTranslations('Legal');

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{t('title')}</h1>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <Link href="/legal/privacy" className="text-blue-600 hover:underline">
            {t('privacyPolicy')}
          </Link>
        </li>
        <li>
          <Link href="/legal/terms" className="text-blue-600 hover:underline">
            {t('termsOfService')}
          </Link>
        </li>
      </ul>
    </div>
  );
}

// Main page component
export default async function LegalPage({ params }: { params: Promise<{ locale: string }> }) {
  // Await params before using locale
  const { locale } = await params;

  // Validate locale to prevent errors
  if (!isValidLocale(locale)) {
    console.error(`Invalid locale in Legal page: ${locale}`);
    notFound();
  }

  return <LegalContent />;
}
