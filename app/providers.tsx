'use client';

import { AuthorizationProvider } from '@/components/molecules/AuthorizationProvider';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Server Provider - This component uses ClerkProvider for authentication
 * It should be used at the root level of the application
 */
export function Providers({ children }: ProvidersProps) {
  return <ClerkProvider>{children}</ClerkProvider>;
}

/**
 * Client Providers - These components require client-side JavaScript
 * They include theme management, authorization context, and toast notifications
 */
export function ClientProviders({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthorizationProvider>
        {children}
        <Toaster closeButton position="bottom-right" richColors />
      </AuthorizationProvider>
    </ThemeProvider>
  );
}
