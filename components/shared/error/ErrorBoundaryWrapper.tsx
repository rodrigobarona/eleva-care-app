'use client';

import { ErrorBoundary } from 'react-error-boundary';

import { ErrorFallback } from './ErrorFallback';

interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
}

export function ErrorBoundaryWrapper({ children }: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset the app state here
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
