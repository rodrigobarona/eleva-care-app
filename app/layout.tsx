'use client';

import { ClientProviders } from '@/app/providers';
import { ErrorBoundaryWrapper } from '@/components/molecules/ErrorBoundaryWrapper';
import { defaultLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ClerkProvider } from '@clerk/nextjs';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Alexandria, JetBrains_Mono, Lora } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

// Import global CSS
import './globals.css';

// Font definitions
const lora = Lora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lora',
});
const alexandria = Alexandria({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-alexandria',
});
const jetBrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Default messages for routes outside the locale group
  const defaultMessages = {};

  return (
    <ClerkProvider
      signInFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL}
      signUpFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL}
      signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
      signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}
    >
      <html
        lang={defaultLocale}
        className={cn(
          `${alexandria.variable} ${lora.variable} ${jetBrains.variable}`,
          'scroll-smooth',
        )}
        suppressHydrationWarning
      >
        <head />
        <body className="min-h-screen bg-background font-sans antialiased">
          <ErrorBoundaryWrapper>
            <NuqsAdapter>
              <ClientProviders messages={defaultMessages}>
                {children}
                <SpeedInsights />
              </ClientProviders>
            </NuqsAdapter>
          </ErrorBoundaryWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
}
