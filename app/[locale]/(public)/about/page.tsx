import { useTranslations } from 'next-intl';

/**
 * Renders the About page with localized title and description.
 *
 * Displays a heading and descriptive text using translations from the "About" namespace.
 */
export default function AboutPage() {
  const t = useTranslations('About');

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold">{t('title')}</h1>
      <p className="mt-4 text-xl">{t('description')}</p>
    </div>
  );
}
