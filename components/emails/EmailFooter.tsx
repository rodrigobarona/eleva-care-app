import * as React from 'react';
import type { EmailContext } from '@/emails/utils/i18n';
import { Column, Container, Hr, Link, Row, Section, Text } from '@react-email/components';

export interface EmailFooterProps {
  variant?: 'default' | 'minimal' | 'branded';
  showLogo?: boolean;
  showSocialLinks?: boolean;
  showUnsubscribe?: boolean;
  showContactInfo?: boolean;
  theme?: 'light' | 'dark';
  emailContext?: EmailContext;
  companyName?: string;
  tagline?: string;
  supportEmail?: string;
  unsubscribeUrl?: string;
}

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://eleva.care';

/**
 * Shared Email Footer Component for Eleva Care
 * Includes legal compliance, unsubscribe, and contact information
 *
 * @accessibility
 * - Uses semantic HTML structure
 * - Provides proper ARIA labels
 * - Maintains WCAG 2.1 color contrast ratios
 * - Supports keyboard navigation
 * - Includes proper link descriptions
 */
export function EmailFooter({
  variant = 'default',
  showLogo: _showLogo = true,
  showSocialLinks: _showSocialLinks = false,
  showUnsubscribe = true,
  showContactInfo = true,
  theme = 'light',
  emailContext: _emailContext,
  companyName = 'Eleva Care',
  tagline = "Expert care for women's health",
  supportEmail = 'support@eleva.care',
  unsubscribeUrl,
}: EmailFooterProps) {
  const currentYear = new Date().getFullYear();
  const isDark = theme === 'dark';

  // Final unsubscribe URL with fallback
  const finalUnsubscribeUrl = unsubscribeUrl || `${DEFAULT_BASE_URL}/unsubscribe`;

  // Variant-specific classes
  const variantClasses = {
    default: `
      ${isDark ? 'bg-eleva-neutral-800' : 'bg-eleva-neutral-50'}
      border-t ${isDark ? 'border-eleva-neutral-700' : 'border-eleva-neutral-200'}
      py-10 mt-10
    `,
    minimal: `
      bg-transparent border-none
      py-6 mt-6
    `,
    branded: `
      bg-eleva-primary
      py-10 mt-10
    `,
  };

  // Text color classes based on variant and theme
  const textColorClasses = {
    primary:
      variant === 'branded'
        ? 'text-white/95'
        : isDark
          ? 'text-eleva-neutral-100'
          : 'text-eleva-neutral-700',
    secondary:
      variant === 'branded'
        ? 'text-white/80'
        : isDark
          ? 'text-eleva-neutral-300'
          : 'text-eleva-neutral-500',
    muted:
      variant === 'branded'
        ? 'text-white/60'
        : isDark
          ? 'text-eleva-neutral-400'
          : 'text-eleva-neutral-400',
  };

  // Footer labels (could be internationalized)
  const footerLabels = {
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    unsubscribe: 'Unsubscribe',
    copyright: `© ${currentYear} ${companyName}. All rights reserved.`,
  };

  return (
    <Section className={`${variantClasses[variant]} transition-colors`}>
      <Container className="mx-auto max-w-[600px] px-6">
        {/* Main Footer Content */}
        <Row>
          {/* Company Info */}
          <Column className="w-[60%] pr-6 align-top">
            <Text
              className={`m-0 mb-2 font-sans text-base font-semibold leading-normal ${textColorClasses.primary} `}
            >
              {companyName}
            </Text>

            <Text
              className={`m-0 mb-4 font-sans text-sm leading-relaxed ${textColorClasses.secondary} `}
            >
              {tagline}
            </Text>

            {showContactInfo && (
              <Text className={`m-0 font-sans text-sm ${textColorClasses.secondary} `}>
                <Link
                  href={`mailto:${supportEmail}`}
                  className={` ${textColorClasses.primary} font-medium no-underline transition-opacity hover:opacity-80`}
                  aria-label={`Contact support at ${supportEmail}`}
                >
                  {supportEmail}
                </Link>
              </Text>
            )}
          </Column>

          {/* Links */}
          <Column className="w-[40%] text-right align-top">
            {/* Legal Links */}
            <nav className="mb-5" aria-label="Legal links">
              <Link
                href={`${DEFAULT_BASE_URL}/legal/privacy`}
                className={`mb-2 block font-sans text-sm font-medium no-underline ${textColorClasses.secondary} transition-opacity hover:opacity-80`}
                aria-label="View Privacy Policy"
              >
                {footerLabels.privacyPolicy}
              </Link>
              <Link
                href={`${DEFAULT_BASE_URL}/legal/terms`}
                className={`mb-2 block font-sans text-sm font-medium no-underline ${textColorClasses.secondary} transition-opacity hover:opacity-80`}
                aria-label="View Terms of Service"
              >
                {footerLabels.termsOfService}
              </Link>
            </nav>
          </Column>
        </Row>

        {/* Divider */}
        <Hr
          className={`my-8 w-full border-t border-none ${
            variant === 'branded'
              ? 'border-white/20'
              : isDark
                ? 'border-eleva-neutral-700'
                : 'border-eleva-neutral-200'
          } `}
        />

        {/* Bottom Row */}
        <Row>
          <Column className="w-[70%] text-left align-middle">
            <Text className={`m-0 font-sans text-xs leading-normal ${textColorClasses.muted} `}>
              {footerLabels.copyright}
            </Text>
          </Column>

          <Column className="w-[30%] text-right align-middle">
            {showUnsubscribe && (
              <Link
                href={finalUnsubscribeUrl}
                className={`font-sans text-xs font-medium no-underline ${textColorClasses.muted} rounded border px-2 py-1 ${
                  variant === 'branded'
                    ? 'border-white/20 bg-white/10'
                    : isDark
                      ? 'border-eleva-neutral-600 bg-eleva-neutral-700'
                      : 'border-eleva-neutral-200 bg-transparent'
                } transition-opacity hover:opacity-80`}
                aria-label="Unsubscribe from emails"
              >
                {footerLabels.unsubscribe}
              </Link>
            )}
          </Column>
        </Row>
      </Container>
    </Section>
  );
}
