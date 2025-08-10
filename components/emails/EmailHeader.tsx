import * as React from 'react';
import type { EmailContext } from '@/emails/utils/i18n';
import { Column, Container, Img, Link, Row, Section } from '@react-email/components';

export interface EmailHeaderProps {
  variant?: 'default' | 'minimal' | 'branded';
  showLogo?: boolean;
  showNavigation?: boolean;
  theme?: 'light' | 'dark';
  emailContext?: EmailContext;
  userRole?: 'patient' | 'expert' | 'admin';
  highContrast?: boolean;
}

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://eleva.care';

/**
 * Shared Email Header Component for Eleva Care
 * Used across all email templates for consistent branding
 *
 * @accessibility
 * - Uses semantic HTML structure
 * - Provides proper alt text for images
 * - Maintains WCAG 2.1 color contrast ratios
 * - Includes proper ARIA labels
 * - Supports keyboard navigation
 */
export function EmailHeader({
  variant = 'default',
  showLogo = true,
  showNavigation = false,
  theme = 'light',
  emailContext: _emailContext,
  userRole,
  highContrast,
}: EmailHeaderProps) {
  const isDark = theme === 'dark';

  // Get logo based on theme
  const logoSrc = isDark
    ? `${DEFAULT_BASE_URL}/eleva-logo-white.png`
    : `${DEFAULT_BASE_URL}/eleva-logo-color.png`;

  // Navigation labels (could be internationalized)
  const navLabels = {
    dashboard: 'Dashboard',
    support: 'Support',
  };

  // Variant-specific classes
  const variantClasses = {
    default: `
      ${isDark ? 'bg-eleva-neutral-700' : 'bg-white'}
      ${highContrast ? (isDark ? 'bg-black' : 'bg-white') : ''}
      border-b ${isDark ? 'border-eleva-neutral-600' : 'border-eleva-neutral-200'}
      py-6
    `,
    minimal: `
      bg-transparent border-none
      py-4
    `,
    branded: `
      bg-eleva-primary
      py-6
    `,
  };

  // Text color classes based on variant and theme
  const textColorClasses = {
    primary:
      variant === 'branded'
        ? 'text-white/90'
        : isDark
          ? 'text-eleva-neutral-100'
          : 'text-eleva-neutral-700',
    secondary:
      variant === 'branded'
        ? 'text-white/80'
        : isDark
          ? 'text-eleva-neutral-300'
          : 'text-eleva-neutral-500',
  };

  return (
    <Section className={`${variantClasses[variant]} transition-colors`}>
      <Container className="mx-auto max-w-[600px] px-6">
        <Row>
          <Column className="text-left align-middle">
            {showLogo && (
              <Link
                href={DEFAULT_BASE_URL}
                className="inline-block no-underline"
                aria-label="Go to Eleva Care homepage"
              >
                <Img
                  src={logoSrc}
                  alt="Eleva Care"
                  width="120"
                  height="32"
                  className="block h-auto max-w-[120px] border-none outline-none"
                />
              </Link>
            )}
          </Column>

          <Column className="text-right align-middle">
            {userRole && (
              <div className={`text-sm font-medium ${textColorClasses.primary} font-sans`}>
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </div>
            )}

            {showNavigation && (
              <nav className="mt-2" aria-label="Email header navigation">
                <Link
                  href={`${DEFAULT_BASE_URL}/dashboard`}
                  className={`mr-4 text-sm font-medium no-underline ${textColorClasses.primary} font-sans transition-opacity hover:opacity-80`}
                  aria-label="Go to dashboard"
                >
                  {navLabels.dashboard}
                </Link>
                <Link
                  href={`${DEFAULT_BASE_URL}/support`}
                  className={`text-sm font-medium no-underline ${textColorClasses.primary} font-sans transition-opacity hover:opacity-80`}
                  aria-label="Get support"
                >
                  {navLabels.support}
                </Link>
              </nav>
            )}
          </Column>
        </Row>
      </Container>
    </Section>
  );
}
