'use client';

import type { ReactNode } from 'react';

import { ErrorBoundaryWrapper } from '@/components/molecules/ErrorBoundaryWrapper';

interface PrivateLayoutWrapperProps {
  children: ReactNode;
}

export function PrivateLayoutWrapper({ children }: PrivateLayoutWrapperProps) {
  return <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>;
}
