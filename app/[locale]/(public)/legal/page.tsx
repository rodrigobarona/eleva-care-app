import { Link } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: 'Legal' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default function LegalPage() {
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
