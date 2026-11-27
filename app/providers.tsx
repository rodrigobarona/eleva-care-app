'use client';

import { AuthorizationProvider } from '@/components/shared/providers/AuthorizationProvider';
import { ENV_CONFIG } from '@/config/env';
import { enUS, esES, ptBR, ptPT } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import type { PostHog, PostHogConfig } from 'posthog-js';
import { useEffect, useRef, useState } from 'react';
import { CookieManager } from 'react-cookie-manager';
import { Toaster } from 'sonner';

// Import the createCookieTranslations function
import { createCookieTranslations } from '../lib/i18n/cookie-translations';

/**
 * PostHog pageview + user trackers. Loaded lazily (and only after posthog-js
 * has initialized) so posthog-js / posthog-js/react are not in the critical
 * client bundle. Renders null and never wraps children, so ssr: false is safe.
 */
const PostHogClientTrackers = dynamic(
  () => import('@/components/analytics/PostHogClientTrackers'),
  { ssr: false, loading: () => null },
);

// Enhanced configuration function
const getPostHogConfig = (): Partial<PostHogConfig> => {
  const isDev = ENV_CONFIG.NODE_ENV === 'development';
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  return {
    api_host: ENV_CONFIG.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
    ui_host: ENV_CONFIG.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
    debug: isDev,
    capture_pageview: false, // We handle this manually for enhanced tracking
    capture_pageleave: true,
    capture_performance: true,
    session_recording: {
      recordCrossOriginIframes: true,
    },
    autocapture: {
      capture_copied_text: true,
      css_selector_allowlist: ['[data-ph-capture]'],
      url_allowlist: isDev ? undefined : [window.location.hostname],
    },
    bootstrap: {
      distinctID: undefined,
      isIdentifiedID: false,
      featureFlags: {},
    },
    loaded: (ph: PostHog) => {
      if (isDev) {
        console.log('[PostHog] Loaded successfully');
      }

      ph.register({
        app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        environment: ENV_CONFIG.NODE_ENV,
        build_timestamp: process.env.NEXT_PUBLIC_BUILD_TIMESTAMP,
      });
    },
    advanced_disable_decide: false,
    secure_cookie: !isLocalhost,
    persistence: 'localStorage+cookie' as const,
    cookie_expiration: 365,
    respect_dnt: true,
    opt_out_capturing_by_default: false,
    ip: !isDev,
    property_blacklist: ['$initial_referrer', '$initial_referring_domain'],
  };
};

interface ClientProvidersProps {
  children: React.ReactNode;
  messages: Record<string, unknown>;
}

/**
 * Client Providers - Enhanced with comprehensive PostHog analytics
 * Tracks user behavior across public and private sections
 * Includes feature flags, session recording, and performance monitoring
 */
export function ClientProviders({ children, messages }: ClientProvidersProps) {
  const [posthogClient, setPosthogClient] = useState<PostHog | null>(null);
  const params = useParams();

  // Get the current locale from the URL params
  const currentLocale = (params?.locale as string) || 'en';

  // Map the locale to the correct localization
  const getLocalization = (locale: string) => {
    const localizationMap: Record<string, typeof enUS> = {
      en: enUS,
      pt: ptPT,
      es: esES,
      'pt-BR': ptBR,
    };

    const localization = localizationMap[locale];

    if (!localization && ENV_CONFIG.NODE_ENV === 'development') {
      console.warn(`[Clerk] No localization found for locale: ${locale}`);
    }

    return localization;
  };

  // Keep the latest locale available to the (run-once) PostHog init below
  const localeRef = useRef(currentLocale);
  useEffect(() => {
    localeRef.current = currentLocale;
  }, [currentLocale]);

  useEffect(() => {
    // Enhanced PostHog setup (runs once; global listeners are added once)
    if (typeof window === 'undefined') return;

    const apiKey = ENV_CONFIG.NEXT_PUBLIC_POSTHOG_KEY;

    if (!apiKey) {
      console.warn('[PostHog] Not initialized: Missing API key');
      return;
    }

    // Skip PostHog on localhost in development (optional)
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocalhost && ENV_CONFIG.NODE_ENV === 'development') {
      console.info('[PostHog] Skipped initialization on localhost in development');
      return;
    }

    let cancelled = false;
    let ph: PostHog | null = null;

    // Global listeners (registered once, removed on unmount)
    const onError = (event: ErrorEvent) => {
      ph?.capture('javascript_error', {
        error_message: event.error?.message || event.message,
        error_stack: event.error?.stack,
        filename: event.filename,
        line_number: event.lineno,
        column_number: event.colno,
        user_agent: navigator.userAgent,
      });
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      ph?.capture('unhandled_promise_rejection', {
        reason: event.reason?.toString() || 'Unknown reason',
        stack: event.reason?.stack,
      });
    };
    const onVisibilityChange = () => {
      ph?.capture('page_visibility_changed', {
        visibility_state: document.visibilityState,
      });
    };
    const onOnline = () => ph?.capture('network_status_changed', { status: 'online' });
    const onOffline = () => ph?.capture('network_status_changed', { status: 'offline' });

    const init = async () => {
      try {
        // Lazy-load posthog-js so it stays out of the critical bundle
        const { posthog } = await import('posthog-js');
        if (cancelled) return;

        // Initialize PostHog with enhanced configuration
        const config = getPostHogConfig();

        posthog.init(apiKey, {
          ...config,
          loaded: (instance: PostHog) => {
            config.loaded?.(instance);

            // Track application start
            instance.capture('app_loaded', {
              locale: localeRef.current,
              user_agent: navigator.userAgent,
              screen_width: window.screen.width,
              screen_height: window.screen.height,
              viewport_width: window.innerWidth,
              viewport_height: window.innerHeight,
              timezone: (() => {
                try {
                  return Intl.DateTimeFormat().resolvedOptions().timeZone;
                } catch (error) {
                  console.warn('Failed to get timezone, using UTC:', error);
                  return 'UTC';
                }
              })(),
              language: navigator.language,
              platform: navigator.platform,
            });

            if (!cancelled) setPosthogClient(instance);
          },
        });

        ph = posthog;

        // Enhanced error tracking
        window.addEventListener('error', onError);
        // Track unhandled promise rejections
        window.addEventListener('unhandledrejection', onUnhandledRejection);
        // Track page visibility changes
        document.addEventListener('visibilitychange', onVisibilityChange);
        // Track network status
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
      } catch (error) {
        console.error('[PostHog] Failed to initialize:', error);
      }
    };

    // Defer until the browser is idle (timeout fallback for Safari)
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(() => void init(), { timeout: 4000 });
    } else {
      timeoutId = setTimeout(() => void init(), 1500);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
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
          {/*
            CookieManager wraps the whole app, so it MUST render on the server.
            It used to be loaded with next/dynamic({ ssr: false }), which made the
            server HTML body empty on every page (nothing visible until all JS
            loaded and hydrated). It is SSR-safe: its first render returns only
            {children}; the banner/modals mount after effects run.
          */}
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
            {posthogClient && <PostHogClientTrackers client={posthogClient} />}
            {children}
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
  timeZone,
}: {
  children: React.ReactNode;
  locale: string;
  messages: Record<string, unknown>;
  /**
   * Required now that pages server-render: a client-rendered
   * NextIntlClientProvider does not inherit the server config, and a missing
   * timeZone makes use-intl raise ENVIRONMENT_FALLBACK during SSR.
   */
  timeZone: string;
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
      timeZone={timeZone}
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
