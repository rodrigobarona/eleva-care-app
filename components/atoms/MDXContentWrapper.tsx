'use client';

import { getFileLocale } from '@/lib/i18n/utils';
import { useTranslations } from 'next-intl';
import React from 'react';

type MDXContentWrapperProps = {
  locale: string;
  namespace: string;
  fallbackLocale?: string;
};

export default function MDXContentWrapper({
  locale,
  namespace,
  fallbackLocale = 'en',
}: MDXContentWrapperProps) {
  const [Content, setContent] = React.useState<React.ComponentType | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const t = useTranslations('common');
  const errorT = useTranslations('Error');
  const notFoundT = useTranslations('NotFound');

  React.useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      setError(null);

      // Convert ISO locale to file locale (e.g., pt-BR -> br)
      const fileLocale = getFileLocale(locale);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[MDXContentWrapper] Loading content for ${namespace}, locale: ${fileLocale}`);
      }

      try {
        // Try to load the MDX content for the current locale
        const contentModule = await import(`@/content/${namespace}/${fileLocale}.mdx`);
        setContent(() => contentModule.default);
      } catch (e) {
        console.log(
          `MDX file for locale ${fileLocale} in namespace ${namespace} not found, falling back to ${fallbackLocale}`,
          e,
        );

        try {
          // Try fallback locale
          const fallbackModule = await import(`@/content/${namespace}/${fallbackLocale}.mdx`);
          setContent(() => fallbackModule.default);
        } catch (fallbackError) {
          console.error(
            `Failed to load content for namespace ${namespace} in any locale`,
            fallbackError,
          );
          setError(fallbackError as Error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [locale, namespace, fallbackLocale]);

  if (isLoading) {
    return <p className="p-8">{t('loading')}</p>;
  }

  if (error) {
    return (
      <p className="p-8 text-red-500">
        {errorT('title')} {namespace}
      </p>
    );
  }

  if (!Content) {
    return (
      <p className="p-8 text-amber-500">
        {notFoundT('title')} {namespace}
      </p>
    );
  }

  return <Content />;
}
