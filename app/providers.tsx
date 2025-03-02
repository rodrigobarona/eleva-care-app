'use client';

import { AuthorizationProvider } from '@/components/molecules/AuthorizationProvider';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';
import dynamic from 'next/dynamic';
import 'react-cookie-manager/style.css';
import { Toaster } from 'sonner';

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
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthorizationProvider>
        <CookieManager
          cookieKitId="67c4aff8666e5176795fd7d1"
          showManageButton={true}
          enableFloatingButton={true}
          displayType="popup"
          cookieKey="eleva-care-cookie-consent"
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
          {children}
          <Toaster closeButton position="bottom-right" richColors />
        </CookieManager>
      </AuthorizationProvider>
    </ThemeProvider>
  );
}
