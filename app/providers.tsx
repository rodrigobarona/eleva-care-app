'use client';

import { AuthorizationProvider } from '@/components/molecules/AuthorizationProvider';
import { ExpertOnboardingProvider } from '@/components/molecules/ExpertOnboardingProvider';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <ClerkProvider>{children}</ClerkProvider>;
}

export function ClientProviders({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthorizationProvider>
        <ExpertOnboardingProvider>
          {children}
          <Toaster />
        </ExpertOnboardingProvider>
      </AuthorizationProvider>
    </ThemeProvider>
  );
}
