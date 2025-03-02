'use client';

import { AuthorizationProvider } from '@/components/molecules/AuthorizationProvider';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';
import dynamic from 'next/dynamic';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
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
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_000000000', {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      capture_pageview: false, // Disable automatic pageview capture, as we capture manually
      capture_pageleave: true, // Enable pageleave capture
    });
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
            <PostHogPageView />
            {children}
            <Toaster closeButton position="bottom-right" richColors />
          </PHProvider>
        </CookieManager>
      </AuthorizationProvider>
    </ThemeProvider>
  );
}
