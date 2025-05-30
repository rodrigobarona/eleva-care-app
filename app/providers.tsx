'use client';

import { AuthorizationProvider } from '@/components/molecules/AuthorizationProvider';
import { ENV_CONFIG } from '@/config/env';
import { enUS, esES, ptBR, ptPT } from '@clerk/localizations';
import { ClerkProvider, useUser } from '@clerk/nextjs';
import { NovuProvider } from '@novu/react';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { posthog } from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, useState } from 'react';
import 'react-cookie-manager/style.css';
import { Toaster } from 'sonner';

// Import the createCookieTranslations function
import { createCookieTranslations } from '../lib/i18n/cookie-translations';
import PostHogPageView from './PostHogPageView';

// Dynamically import CookieManager to prevent SSR issues
const CookieManager = dynamic(
  () => import('react-cookie-manager').then((mod) => mod.CookieManager),
  { ssr: false, loading: () => null },
);

// Define NovuWrapper component here to access useUser hook
function NovuWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();

  // Ensure Clerk user is loaded and applicationIdentifier is available
  if (!isLoaded || !user || !ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER) {
    // You might want to render a loading state or null while waiting for user/config
    // For now, just return children if Novu cannot be initialized.
    // Or, you could show a specific loading indicator for Novu.
    return <>{children}</>;
  }

  return (
    <NovuProvider
      subscriberId={user.id} // Assuming Clerk user.id is the correct subscriberId for Novu
      applicationIdentifier={ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER}
      // initialFetchingStrategy can be added here if needed, e.g.
      // initialFetchingStrategy={{ fetchNotifications: true, fetchUserPreferences: true }}
    >
      {children}
    </NovuProvider>
  );
}

interface ClientProvidersProps {
  children: React.ReactNode;
  messages: Record<string, unknown>;
}

/**
 * Client Providers - These components provide client-side features
 * ClerkProvider, ThemeProvider, AuthorizationProvider, CookieManager, PostHog, and Toaster
 * This does NOT include internationalization (use IntlProvider for that)
 */
export function ClientProviders({ children, messages }: ClientProvidersProps) {
  const [posthogLoaded, setPosthogLoaded] = useState(false);
  const params = useParams();

  // Get the current locale from the URL params
  const currentLocale = (params?.locale as string) || 'en';

  // Map the locale to the correct localization based on the imported localizations
  const getLocalization = (locale: string) => {
    // Direct mapping from URL locales to imported localizations
    const localizationMap: Record<string, typeof enUS> = {
      en: enUS,
      pt: ptPT,
      es: esES,
      'pt-BR': ptBR,
    };

    // Only access properties we know exist
    const localization = localizationMap[locale];

    if (!localization && process.env.NODE_ENV === 'development') {
      console.warn(`[Clerk] No localization found for locale: ${locale}`);
    }

    return localization;
  };

  useEffect(() => {
    // PostHog setup
    if (typeof window === 'undefined') return;

    // Skip PostHog on localhost/development environments
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.info('[PostHog] Skipped initialization on localhost');
      return;
    }

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
        capture_pageview: false,
        capture_pageleave: true,
        loaded: (_ph) => {
          setPosthogLoaded(true);
        },
        advanced_disable_decide: true, // Disable remote configuration
        disable_session_recording: true, // Disable session recording
        autocapture: false, // Disable automatic event capture
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
    <ClerkProvider
      localization={getLocalization(currentLocale)}
      signInFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL}
      signUpFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL}
      signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
      signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}
    >
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AuthorizationProvider>
          <CookieManager
            cookieKitId={process.env.NEXT_PUBLIC_COOKIE_KIT_ID || ''}
            showManageButton={true}
            enableFloatingButton={false}
            displayType="popup"
            cookieKey={process.env.NEXT_PUBLIC_COOKIE_KEY || ''}
            theme="light"
            privacyPolicyUrl="/legal/cookie"
            translations={createCookieTranslations(messages)}
          >
            <PHProvider client={posthog}>
              {posthogLoaded && <PostHogPageView />}
              <NovuWrapper>{children}</NovuWrapper>
            </PHProvider>
            <Toaster closeButton position="bottom-right" richColors />
          </CookieManager>
        </AuthorizationProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}

/**
 * Internationalization Provider - For locale-specific routes
 * This wraps content with NextIntlClientProvider for translations
 * and also updates the HTML lang attribute to match the current locale
 */
export function IntlProvider({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, unknown>;
}) {
  // Update HTML lang attribute when the locale changes
  useEffect(() => {
    if (locale) {
      // Find all HTML elements with data-dynamic-lang attribute
      const htmlElement = document.documentElement;

      // Update HTML lang attribute if it has the dynamic lang data attribute
      // This ensures we're not fighting with the server-rendered attribute in non-locale routes
      if (htmlElement.getAttribute('data-dynamic-lang') === 'true') {
        htmlElement.lang = locale;
        console.log(`IntlProvider: Updated HTML lang attribute to ${locale}`);
      }

      // Set cookie to remember locale for future server-rendered pages
      document.cookie = `ELEVA_LOCALE=${locale};max-age=31536000;path=/`;
    }
  }, [locale]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(error) => {
        if (error.code === 'MISSING_MESSAGE') {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Missing translation:', error.message);
          }
          return error.message;
        }
        throw error;
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
