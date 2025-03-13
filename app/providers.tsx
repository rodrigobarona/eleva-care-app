'use client';

import { AuthorizationProvider } from '@/components/molecules/AuthorizationProvider';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';
import dynamic from 'next/dynamic';
import { posthog } from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, useState } from 'react';
import 'react-cookie-manager/style.css';
import { Toaster } from 'sonner';

import PostHogPageView from './PostHogPageView';

// Dynamically import CookieManager to prevent SSR issues
const CookieManager = dynamic(
  () => import('react-cookie-manager').then((mod) => mod.CookieManager),
  { ssr: false, loading: () => null },
);

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
  const [posthogLoaded, setPosthogLoaded] = useState(false);

  useEffect(() => {
    // Only run on client
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
            {children}
          </PHProvider>
          <Toaster closeButton position="bottom-right" richColors />
        </CookieManager>
      </AuthorizationProvider>
    </ThemeProvider>
  );
}
