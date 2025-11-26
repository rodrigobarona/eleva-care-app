'use client';

import * as Sentry from '@sentry/nextjs';
import { ErrorBoundary } from 'react-error-boundary';

import { ErrorFallback } from './ErrorFallback';

interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
}

export function ErrorBoundaryWrapper({ children }: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        // Send error to BetterStack via Sentry
        Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: info.componentStack,
            },
          },
          tags: {
            error_boundary: 'ErrorBoundaryWrapper',
          },
        });
      }}
      onReset={() => {
        // Reset the app state here
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
