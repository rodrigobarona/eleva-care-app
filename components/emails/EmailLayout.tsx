import * as React from 'react';
import type { EmailContext, SupportedLocale } from '@/emails/utils/i18n';
import tailwindConfig from '@/tailwind.config.email';
import { Body, Container, Head, Html, Preview, Tailwind } from '@react-email/components';

import { EmailFooter } from './EmailFooter';
import { EmailHeader } from './EmailHeader';

export interface EmailLayoutProps {
  children: React.ReactNode;
  subject: string;
  preheader?: string;
  headerVariant?: 'default' | 'minimal' | 'branded';
  footerVariant?: 'default' | 'minimal' | 'branded';
  theme?: 'light' | 'dark';
  locale?: SupportedLocale;
  emailContext?: EmailContext;
  userRole?: 'patient' | 'expert' | 'admin';
  darkMode?: boolean;
  highContrast?: boolean;
}

/**
 * Base Email Layout Component for Eleva Care
 * Provides consistent structure for all email templates with header/footer
 *
 * @accessibility
 * - Uses semantic HTML structure
 * - Supports dark mode and high contrast
 * - Maintains WCAG 2.1 color contrast ratios
 * - Provides language and direction attributes
 * - Includes meta tags for better client compatibility
 */
export function EmailLayout({
  children,
  subject,
  preheader,
  headerVariant = 'default',
  footerVariant = 'default',
  theme = 'light',
  locale = 'en',
  emailContext,
  userRole,
  darkMode,
  highContrast,
}: EmailLayoutProps) {
  const isDark = darkMode || theme === 'dark';

  return (
    <Tailwind config={tailwindConfig}>
      <Html
        lang={locale}
        dir="ltr"
        className={`${isDark ? 'dark' : ''} ${highContrast ? 'high-contrast' : ''}`}
      >
        <Head>
          <title>{subject}</title>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="x-apple-disable-message-reformatting" />
          <meta name="color-scheme" content={isDark ? 'dark' : 'light'} />
          <meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
        </Head>

        {preheader && <Preview>{preheader}</Preview>}

        <Body
          className={`m-0 p-5 font-sans ${isDark ? 'bg-eleva-neutral-800' : 'bg-eleva-neutral-50'} ${highContrast ? (isDark ? 'bg-black' : 'bg-white') : ''} `}
        >
          <Container
            className={`mx-auto max-w-[600px] overflow-hidden ${isDark ? 'bg-eleva-neutral-700' : 'bg-white'} ${highContrast ? (isDark ? 'bg-black' : 'bg-white') : ''} ${!highContrast ? 'shadow-md' : ''} rounded-lg`}
          >
            {/* Email Header */}
            <EmailHeader
              variant={headerVariant}
              theme={theme}
              emailContext={emailContext}
              userRole={userRole}
              highContrast={highContrast}
            />

            {/* Main Content */}
            <Container className="p-8">{children}</Container>

            {/* Email Footer */}
            <EmailFooter variant={footerVariant} theme={theme} emailContext={emailContext} />
          </Container>

          {/* Global styles for email clients */}
          <style>{`
            /* Reset styles for email clients */
            body, table, td, p, a, li, blockquote {
              -webkit-text-size-adjust: 100%;
              -ms-text-size-adjust: 100%;
            }
            
            table, td {
              mso-table-lspace: 0pt;
              mso-table-rspace: 0pt;
            }
            
            img {
              -ms-interpolation-mode: bicubic;
              border: 0;
              height: auto;
              line-height: 100%;
              outline: none;
              text-decoration: none;
            }
            
            /* Dark mode styles */
            .dark {
              color-scheme: dark;
            }
            
            /* High contrast overrides */
            .high-contrast.dark {
              background-color: #000000 !important;
              color: #FFFFFF !important;
            }
            
            .high-contrast:not(.dark) {
              background-color: #FFFFFF !important;
              color: #000000 !important;
            }
            
            /* Outlook specific fixes */
            .outlook-font-fix {
              font-family: Arial, sans-serif !important;
            }
            
            /* Mobile responsive */
            @media screen and (max-width: 600px) {
              .mobile-full-width {
                width: 100% !important;
                max-width: 100% !important;
              }
              
              .mobile-padding {
                padding: 16px !important;
              }
              
              .mobile-text-center {
                text-align: center !important;
              }
            }
          `}</style>
        </Body>
      </Html>
    </Tailwind>
  );
}
