'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

type MDXContentWrapperProps = {
  locale: string;
  namespace: string;
  fallbackLocale?: string;
};

// Simple ErrorBoundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Create a content cache to prevent unnecessary dynamic imports
const contentCache: Record<string, React.ComponentType> = {};

export default function MDXContentWrapper({
  locale,
  namespace,
  fallbackLocale = 'en',
}: MDXContentWrapperProps) {
  const [Content, setContent] = React.useState<React.ComponentType | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const contentKey = `${namespace}/${locale}`;
  const fallbackKey = `${namespace}/${fallbackLocale}`;

  const t = useTranslations('common');
  const errorT = useTranslations('Error');
  const notFoundT = useTranslations('NotFound');

  React.useEffect(() => {
    // Don't reload if we already have the content cached
    if (contentCache[contentKey]) {
      setContent(() => contentCache[contentKey]);
      setIsLoading(false);
      return;
    }

    const loadContent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use direct import() for proper error handling with try/catch
        const { default: ContentComponent } = await import(
          /* webpackChunkName: "mdx-[request]" */
          `@/content/${namespace}/${locale}.mdx`
        );

        // Cache the content
        contentCache[contentKey] = ContentComponent;
        setContent(() => ContentComponent);
      } catch (e) {
        // Use a logger that can be conditionally disabled in production
        if (process.env.NODE_ENV !== 'production') {
          console.log(
            `MDX file for locale ${locale} in namespace ${namespace} not found, falling back to ${fallbackLocale}`,
            e,
          );
        }

        try {
          // Check if fallback is already cached
          if (contentCache[fallbackKey]) {
            setContent(() => contentCache[fallbackKey]);
            return;
          }

          // Try fallback locale with direct import
          const { default: FallbackComponent } = await import(
            /* webpackChunkName: "mdx-fallback-[request]" */
            `@/content/${namespace}/${fallbackLocale}.mdx`
          );

          // Cache the fallback content
          contentCache[fallbackKey] = FallbackComponent;
          setContent(() => FallbackComponent);
        } catch (fallbackError) {
          if (process.env.NODE_ENV !== 'production') {
            console.error(
              `Failed to load content for namespace ${namespace} in any locale`,
              fallbackError,
            );
          }
          setError(fallbackError as Error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [contentKey, fallbackKey, locale, namespace, fallbackLocale]);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 p-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-8">
        <p className="font-medium text-red-500">
          {errorT('title')} {namespace}
        </p>
        <button
          type="button"
          className="mt-2 text-sm text-red-600 hover:text-red-800"
          onClick={() => window.location.reload()}
        >
          {errorT('retry')}
        </button>
      </div>
    );
  }

  if (!Content) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 p-8">
        <p className="font-medium text-amber-500">
          {notFoundT('title')} {namespace}
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={<p className="p-8 text-red-500">{errorT('title')}</p>}>
      <Content />
    </ErrorBoundary>
  );
}
