import { ErrorBoundaryWrapper } from '@/components/molecules/ErrorBoundaryWrapper';
import { LanguageProvider } from '@/components/molecules/LanguageProvider';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Alexandria, JetBrains_Mono, Lora } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { posthog } from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import type React from 'react';
import { useEffect, useState } from 'react';
import 'react-cookie-manager/style.css';

import './globals.css';
import PostHogPageView from './PostHogPageView';
import { ClientProviders, Providers } from './providers';

// Dynamically import CookieManager to prevent SSR issues
const CookieManager = dynamic(
  () => import('react-cookie-manager').then((mod) => mod.CookieManager),
  { ssr: false, loading: () => null },
);

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

export const metadata: Metadata = {
  title: 'Expert care for Pregnancy, Postpartum & Sexual Health | Eleva Care',
  description:
    'Eleva Care: Empowering growth, embracing care. Expert care for pregnancy, postpartum, menopause, and sexual health.',
  openGraph: {
    type: 'website',
    url: 'https://eleva.care',
    siteName: 'Eleva Care',
    title: 'Expert care for Pregnancy, Postpartum & Sexual Health | Eleva Care',
    description:
      'Eleva Care: Empowering growth, embracing care. Expert care for pregnancy, postpartum, menopause, and sexual health.',
    images: [
      {
        url: 'https://eleva.care/img/eleva-care-share.svg',
        width: 1200,
        height: 680,
        alt: 'Eleva Care',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [posthogLoaded, setPosthogLoaded] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    // Check if we have valid config
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!apiKey || !apiHost) {
      console.warn('[PostHog] Not initialized: Missing or invalid API key or host');
      return;
    }

    try {
      // Initialize PostHog with error handling
      posthog.init(apiKey, {
        api_host: apiHost,
        capture_pageview: false, // Disable automatic pageview capture, as we capture manually
        capture_pageleave: true, // Enable pageleave capture
        loaded: (_ph) => {
          setPosthogLoaded(true);
        },
        advanced_disable_decide: false, // If still getting remote config errors, set to true
      });

      // Add global error listener for PostHog
      window.addEventListener('error', (event) => {
        if (event.error?.message?.includes('PostHog')) {
          console.warn('[PostHog] Error caught:', event.error.message);
          event.preventDefault();
        }
      });
    } catch (error) {
      console.error('[PostHog] Failed to initialize:', error);
    }
  }, []);
  return (
    <Providers>
      <html
        lang="en"
        className={cn(
          `${alexandria.variable} ${lora.variable} ${jetBrains.variable}`,
          'scroll-smooth',
        )}
        suppressHydrationWarning
      >
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
          <CookieManager
            cookieKitId={process.env.NEXT_PUBLIC_COOKIE_KIT_ID || ''}
            showManageButton={true}
            enableFloatingButton={false}
            displayType="popup"
            cookieKey={process.env.NEXT_PUBLIC_COOKIE_KEY || ''}
            theme="light"
            privacyPolicyUrl="/legal/cookie"
            translations={{
              title: 'Cookie Preferences',
              message:
                'We use cookies to enhance your experience, analyze site traffic, and for marketing purposes. By clicking "Accept", you consent to our use of cookies.',
              buttonText: 'Accept All',
              declineButtonText: 'Decline All',
              manageButtonText: 'Manage Preferences',
              privacyPolicyText: 'Cookie Policy',
            }}
          >
            <PHProvider client={posthog}>
              {posthogLoaded && <PostHogPageView />}
              <ErrorBoundaryWrapper>
                <NuqsAdapter>
                  <ClientProviders>
                    <LanguageProvider>{children}</LanguageProvider>
                  </ClientProviders>
                </NuqsAdapter>
              </ErrorBoundaryWrapper>
            </PHProvider>
          </CookieManager>
        </body>
      </html>
    </Providers>
  );
}
