'use client';

import * as Sentry from '@sentry/nextjs';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

// Rename Error to avoid shadowing the global Error object
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('Error');

  useEffect(() => {
    // Send error to BetterStack via Sentry
    Sentry.captureException(error, {
      tags: {
        error_boundary: 'app_error_boundary',
        digest: error.digest,
      },
      extra: {
        digest: error.digest,
        errorMessage: error.message,
      },
    });

    // Also log to console for development
    console.error('App Error Boundary caught error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center">
      <h1 className="mb-4 text-4xl font-bold">{t('title')}</h1>
      <p className="mb-8 text-lg text-muted-foreground">{t('description')}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-md bg-destructive px-6 py-2 text-destructive-foreground hover:bg-destructive/90"
      >
        {t('retry')}
      </button>
    </div>
  );
}
