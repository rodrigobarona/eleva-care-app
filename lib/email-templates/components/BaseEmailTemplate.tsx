import { Body, Container, Head, Html, Preview, Tailwind } from '@react-email/components';
import React from 'react';

import {
  darkModeTokens,
  emailDesignTokens,
  highContrastTokens,
  rtlAdjustments,
} from '../design-tokens';
import { EmailRenderOptions } from '../types';
import { EmailFooter } from './EmailFooter';
import { EmailHeader } from './EmailHeader';

interface BaseEmailTemplateProps {
  children?: React.ReactNode;
  subject: string;
  preheader?: string;
  renderOptions?: EmailRenderOptions;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Base Email Template Component
 * Provides consistent foundation for all email templates with:
 * - WCAG 2.1 AA accessibility compliance
 * - Multi-language support
 * - Dark mode support
 * - High contrast mode
 * - RTL language support
 * - Email client compatibility
 */
export const BaseEmailTemplate: React.FC<BaseEmailTemplateProps> = ({
  children,
  preheader,
  renderOptions = {
    locale: 'en',
    userRole: 'patient',
    rtl: false,
    darkMode: false,
    highContrast: false,
    previewMode: false,
  },
  className = '',
  style = {},
}) => {
  const { locale, rtl = false, darkMode = false, highContrast = false } = renderOptions;

  // Get appropriate design tokens based on rendering options
  const getDesignTokens = () => {
    let tokens = emailDesignTokens;

    if (highContrast) {
      tokens = { ...tokens, ...highContrastTokens };
    } else if (darkMode) {
      tokens = { ...tokens, ...darkModeTokens };
    }

    return tokens;
  };

  const tokens = getDesignTokens();

  // Generate Tailwind config for email
  const tailwindConfig = {
    theme: {
      extend: {
        colors: {
          primary: tokens.colors.primary,
          neutral: tokens.colors.neutral,
          semantic: tokens.colors.semantic,
          brand: tokens.colors.brand,
        },
        fontFamily: {
          sans: [tokens.typography.families.primary],
          mono: [tokens.typography.families.mono],
        },
        fontSize: tokens.typography.sizes,
        spacing: tokens.spacing,
        borderRadius: tokens.borderRadius,
        boxShadow: tokens.shadows,
      },
    },
  };

  // Base styles for the email container
  const containerStyles: React.CSSProperties = {
    fontFamily: tokens.typography.families.primary,
    fontSize: tokens.typography.sizes.base,
    lineHeight: tokens.typography.lineHeights.normal,
    color: darkMode ? tokens.colors.neutral[100] : tokens.colors.neutral[800],
    backgroundColor: darkMode ? tokens.colors.neutral[900] : '#FFFFFF',
    direction: rtl ? 'rtl' : 'ltr',
    textAlign: rtl ? 'right' : 'left',
    ...style,
  };

  // Add RTL adjustments if needed
  const rtlStyles = rtl ? rtlAdjustments : {};

  return (
    <Html lang={locale} dir={rtl ? 'rtl' : 'ltr'}>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="color-scheme" content={darkMode ? 'dark' : 'light'} />
        <meta name="supported-color-schemes" content="light dark" />

        {/* Accessibility meta tags */}
        <meta name="format-detection" content="telephone=no,date=no,address=no,email=no" />
        <meta name="x-apple-disable-message-reformatting" />

        {/* RTL support */}
        {rtl && <meta name="dir" content="rtl" />}

        {/* Email client specific meta tags */}
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/* Custom styles for email clients */}
        <style>{`
          /* Outlook specific fixes */
          <!--[if mso]>
          <style type="text/css">
            .outlook-font-fix {
              font-family: Arial, sans-serif !important;
            }
            .outlook-padding {
              padding: 0 !important;
              margin: 0 !important;
            }
          </style>
          <![endif]-->
          
          /* Reset styles for email clients */
          body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          
          /* Remove spacing around the email design */
          table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
          }
          
          /* Force Outlook to provide a "view in browser" message */
          #outlook a {
            padding: 0;
          }
          
          /* Force Hotmail to display emails at full width */
          .ReadMsgBody {
            width: 100%;
          }
          .ExternalClass {
            width: 100%;
          }
          
          /* Force Hotmail to display normal line spacing */
          .ExternalClass,
          .ExternalClass p,
          .ExternalClass span,
          .ExternalClass font,
          .ExternalClass td,
          .ExternalClass div {
            line-height: 100%;
          }
          
          /* Prevent WebKit and Windows mobile from changing default text sizes */
          body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          
          /* Allow smoother rendering of resized image in Internet Explorer */
          img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
          }
          
          /* Dark mode support */
          @media (prefers-color-scheme: dark) {
            .dark-mode-bg {
              background-color: ${darkMode ? tokens.colors.neutral[900] : '#FFFFFF'} !important;
            }
            .dark-mode-text {
              color: ${darkMode ? tokens.colors.neutral[100] : tokens.colors.neutral[800]} !important;
            }
          }
          
          /* High contrast mode support */
          @media (prefers-contrast: high) {
            .high-contrast {
              border: 2px solid ${tokens.colors.neutral[900]} !important;
            }
            .high-contrast-text {
              color: ${tokens.colors.neutral[900]} !important;
              font-weight: bold !important;
            }
          }
          
          /* Mobile responsive styles */
          @media screen and (max-width: 600px) {
            .mobile-full-width {
              width: 100% !important;
              max-width: 100% !important;
            }
            .mobile-padding {
              padding: ${tokens.spacing.md} !important;
            }
            .mobile-text-center {
              text-align: center !important;
            }
            .mobile-hidden {
              display: none !important;
            }
          }
          
          /* Print styles */
          @media print {
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </Head>

      {preheader && <Preview>{preheader}</Preview>}

      <Tailwind config={tailwindConfig}>
        <Body
          className={`bg-neutral-50 py-10 font-sans ${darkMode ? 'dark-mode-bg' : ''} ${className}`}
          style={containerStyles}
        >
          {/* Skip to content link for accessibility */}
          <a
            href="#main-content"
            className="focus:bg-primary-500 sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:px-4 focus:py-2 focus:text-white"
            style={{
              position: 'absolute',
              left: '-9999px',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
            }}
          >
            Skip to main content
          </a>

          <Container
            className={`mobile-full-width mx-auto max-w-[600px] ${highContrast ? 'high-contrast' : ''}`}
            style={{
              maxWidth: '600px',
              margin: '0 auto',
              ...rtlStyles,
            }}
          >
            {/* Email Header */}
            <EmailHeader
              variant="default"
              showLogo={true}
              showNavigation={false}
              language={locale}
              theme={darkMode ? 'dark' : 'light'}
            />

            {/* Main Content */}
            <main
              id="main-content"
              className={`mobile-padding rounded-lg bg-white shadow-md ${darkMode ? 'dark-mode-bg' : ''}`}
              style={{
                backgroundColor: darkMode ? tokens.colors.neutral[800] : '#FFFFFF',
                borderRadius: tokens.borderRadius.lg,
                padding: tokens.spacing.lg,
                marginTop: tokens.spacing.md,
                marginBottom: tokens.spacing.md,
              }}
              role="main"
              aria-label="Email content"
            >
              {children}
            </main>

            {/* Email Footer */}
            <EmailFooter
              variant="default"
              showLogo={true}
              showSocialLinks={true}
              showUnsubscribe={true}
              showContactInfo={true}
              language={locale}
              theme={darkMode ? 'dark' : 'light'}
              userPreferences={{
                unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe`,
              }}
            />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default BaseEmailTemplate;
