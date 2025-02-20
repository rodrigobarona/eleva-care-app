'use client';

import { ErrorBoundaryWrapper } from '@/components/molecules/ErrorBoundaryWrapper';
import type { ReactNode } from 'react';

interface PrivateLayoutWrapperProps {
  children: ReactNode;
}

export function PrivateLayoutWrapper({ children }: PrivateLayoutWrapperProps) {
  return <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>;
}
