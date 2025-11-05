'use client';

/**
 * Client Providers - WorkOS AuthKit Version
 *
 * Provides client-side functionality for:
 * - WorkOS authentication (via built-in useAuth hook)
 * - Theme management
 * - PostHog analytics
 * - Novu notifications
 * - Cookie consent
 * - Authorization context
 */
import { AuthorizationProvider } from '@/components/shared/providers/AuthorizationProvider';
import { ENV_CONFIG } from '@/config/env';
import { NovuProvider } from '@novu/nextjs';
import { NovuProvider as ReactNovuProvider } from '@novu/react';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import dynamic from 'next/dynamic';
import { useParams, usePathname } from 'next/navigation';
import { posthog, PostHog, PostHogConfig } from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

import { createCookieTranslations } from '../lib/i18n/cookie-translations';
import PostHogPageView from './PostHogPageView';

// Dynamically import CookieManager to prevent SSR issues
const CookieManager = dynamic(
  () => import('react-cookie-manager').then((mod) => mod.CookieManager),
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

// PostHog user identification and tracking (WorkOS version)
function PostHogUserTracker() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const params = useParams();

  useEffect(() => {
    if (loading || typeof window === 'undefined') return;

    const locale = (params?.locale as string) || 'en';
    const isPrivateRoute =
      pathname?.startsWith('/(private)') ||
      pathname?.includes('/dashboard') ||
      pathname?.includes('/account') ||
      pathname?.includes('/admin');

    posthog.register({
      route_type: isPrivateRoute ? 'private' : 'public',
      locale: locale,
      user_authenticated: !!user,
    });

    if (user) {
      posthog.identify(user.id, {
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        first_name: user.firstName,
        last_name: user.lastName,
        avatar: user.profilePictureUrl,
        email_verified: user.emailVerified,
        preferred_locale: locale,
        timezone: (() => {
          try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
          } catch (error) {
            console.warn('Failed to get timezone, using UTC:', error);
            return 'UTC';
          }
        })(),
      });

      posthog.people.set({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        avatar: user.profilePictureUrl,
        locale: locale,
        last_seen: new Date().toISOString(),
      });
    } else {
      posthog.register({
        user_type: 'anonymous',
        locale: locale,
      });
    }

    posthog.register({
      page_type: isPrivateRoute ? 'app' : 'marketing',
      page_section: isPrivateRoute
        ? pathname?.split('/')[2] || 'dashboard'
        : pathname?.split('/')[2] || 'home',
    });
  }, [user, loading, pathname, params]);

  return null;
}

// Novu wrapper component (WorkOS version)
function NovuWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Ensure WorkOS user is loaded and applicationIdentifier is available
  if (loading || !user || !ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER) {
    return <>{children}</>;
  }

  console.log('[Novu] Provider initialized for user:', user.id);

  return (
    <NovuProvider
      subscriberId={user.id}
      applicationIdentifier={ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER}
    >
      <ReactNovuProvider
        applicationIdentifier={ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER}
        subscriberId={user.id}
        apiUrl="https://eu.api.novu.co"
        socketUrl="https://eu.ws.novu.co"
      >
        {children}
      </ReactNovuProvider>
    </NovuProvider>
  );
}

interface ClientProvidersProps {
  children: React.ReactNode;
  messages: Record<string, unknown>;
}

/**
 * Client Providers - WorkOS Version
 *
 * Enhanced with comprehensive PostHog analytics.
 * Tracks user behavior across public and private sections.
 * Includes feature flags, session recording, and performance monitoring.
 */
export function ClientProviders({ children, messages }: ClientProvidersProps) {
  const [posthogLoaded, setPosthogLoaded] = useState(false);
  const params = useParams();

  // Get the current locale from the URL params
  const currentLocale = (params?.locale as string) || 'en';

  useEffect(() => {
    // Enhanced PostHog setup
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

    try {
      // Initialize PostHog with enhanced configuration
      const config = getPostHogConfig();

      posthog.init(apiKey, {
        ...config,
        loaded: (ph: PostHog) => {
          setPosthogLoaded(true);
          config.loaded?.(ph);

          // Track application start
          ph.capture('app_loaded', {
            locale: currentLocale,
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
        },
      });

      // Enhanced error tracking
      window.addEventListener('error', (event) => {
        posthog.capture('javascript_error', {
          error_message: event.error?.message || event.message,
          error_stack: event.error?.stack,
          filename: event.filename,
          line_number: event.lineno,
          column_number: event.colno,
          user_agent: navigator.userAgent,
        });
      });

      // Track unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        posthog.capture('unhandled_promise_rejection', {
          reason: event.reason?.toString() || 'Unknown reason',
          stack: event.reason?.stack,
        });
      });

      // Track page visibility changes
      document.addEventListener('visibilitychange', () => {
        posthog.capture('page_visibility_changed', {
          visibility_state: document.visibilityState,
        });
      });

      // Track network status
      window.addEventListener('online', () => {
        posthog.capture('network_status_changed', { status: 'online' });
      });

      window.addEventListener('offline', () => {
        posthog.capture('network_status_changed', { status: 'offline' });
      });
    } catch (error) {
      console.error('[PostHog] Failed to initialize:', error);
    }
  }, [currentLocale]);

  return (
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
            {posthogLoaded && (
              <>
                <PostHogPageView />
                <PostHogUserTracker />
              </>
            )}
            <NovuWrapper>{children}</NovuWrapper>
          </PHProvider>
          <Toaster closeButton position="bottom-right" richColors />
        </CookieManager>
      </AuthorizationProvider>
    </ThemeProvider>
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
      const htmlElement = document.documentElement;

      // Update HTML lang attribute if it has the dynamic lang data attribute
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
