'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

type MDXContentWrapperProps = {
  locale: string;
  namespace: string; // e.g., 'about', 'blog', 'services'
  fallbackLocale?: string; // Optional fallback locale if content not found
  contentPathPattern?: string; // Optional pattern for content path
};

export default function MDXContentWrapper({
  locale,
  namespace,
  fallbackLocale = 'en',
  contentPathPattern = '/{namespace}/content/{filename}_{locale}.mdx',
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

      try {
        // Replace pattern placeholders with actual values
        const path = contentPathPattern
          .replace('{namespace}', namespace)
          .replace('{filename}', namespace)
          .replace('{locale}', locale);

        // Dynamic import based on path
        const contentModule = await import(`../../app/[locale]/(public)${path}`);
        setContent(() => contentModule.default);
      } catch (e) {
        console.log(
          `MDX file for locale ${locale} in namespace ${namespace} not found, falling back to ${fallbackLocale}`,
          e,
        );

        try {
          // Try fallback locale
          const fallbackPath = contentPathPattern
            .replace('{namespace}', namespace)
            .replace('{filename}', namespace)
            .replace('{locale}', fallbackLocale);

          const fallbackModule = await import(`../../app/[locale]/(public)${fallbackPath}`);
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
  }, [locale, namespace, fallbackLocale, contentPathPattern]);

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
