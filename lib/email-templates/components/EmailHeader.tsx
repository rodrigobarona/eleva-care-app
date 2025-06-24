import { Column, Container, Img, Link, Row, Section } from '@react-email/components';
import React from 'react';

import { darkModeTokens, emailDesignTokens } from '../design-tokens';
import { EmailHeaderProps } from '../types';

// Centralized URL configuration (consistent with EmailFooter)
const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://eleva.care';

interface LogoVariant {
  src: string;
  alt: string;
  description: string;
}

/**
 * Get appropriate logo variant based on context and theme
 * Following React Email best practices for image optimization
 */
function getLogoVariant(theme: 'light' | 'dark' | 'auto' = 'auto'): LogoVariant {
  // Always use absolute URLs for email clients - they don't support relative URLs
  const baseURL = DEFAULT_BASE_URL;

  const logoVariants = {
    light: {
      src: `${baseURL}/eleva-logo-color.png`,
      alt: 'Eleva Care Logo',
      description: 'Colored Eleva Care full logo for light backgrounds',
    },
    dark: {
      src: `${baseURL}/eleva-logo-white.png`,
      alt: 'Eleva Care Logo',
      description: 'White Eleva Care full logo for dark backgrounds',
    },
    contrast: {
      src: `${baseURL}/eleva-logo-black.png`,
      alt: 'Eleva Care Logo',
      description: 'High contrast black Eleva Care full logo',
    },
  };

  // Auto-select based on theme
  if (theme === 'dark') return logoVariants.dark;
  if (theme === 'auto') return logoVariants.light; // Default to color for auto
  return logoVariants.light;
}

/**
 * Email Header Component with Eleva Care branding
 * Supports multiple themes, languages, and accessibility features
 */
export function EmailHeader({
  variant = 'default',
  showLogo = true,
  showNavigation = false,
  theme = 'light',
  customization = {},
  userContext = {},
}: EmailHeaderProps) {
  // Note: locale is prepared for future translation integration
  // const locale = normalizeLocale(language) as SupportedLocale;
  const logo = getLogoVariant(theme);
  const isDark = theme === 'dark';
  const tokens = isDark ? darkModeTokens : emailDesignTokens;

  // Variant-specific styling with modern improvements
  const variantStyles = {
    default: {
      backgroundColor: '#FFFFFF',
      borderBottom: `1px solid ${tokens.colors?.neutral?.[100] || '#F3F4F6'}`,
      padding: '24px 0',
    },
    minimal: {
      backgroundColor: 'transparent',
      borderBottom: 'none',
      padding: '16px 0',
    },
    branded: {
      backgroundColor: tokens.colors?.brand?.['eleva-primary'] || '#006D77',
      borderBottom: 'none',
      padding: '24px 0',
    },
  } as const;

  const styles = variantStyles[variant || 'default'];

  return (
    <Section
      style={{
        ...styles,
        width: '100%',
        ...customization?.containerStyles,
      }}
    >
      <Container
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        <Row>
          <Column
            style={{
              textAlign: 'left' as const,
              verticalAlign: 'middle' as const,
              paddingRight: '16px',
            }}
          >
            {showLogo && (
              <Link
                href={DEFAULT_BASE_URL}
                style={{
                  display: 'inline-block',
                  textDecoration: 'none',
                }}
              >
                <Img
                  src={logo.src}
                  alt={logo.alt}
                  width="120"
                  height="32"
                  style={{
                    display: 'block',
                    outline: 'none',
                    border: 'none',
                    textDecoration: 'none',
                    verticalAlign: 'middle',
                    maxWidth: '120px',
                    height: 'auto',
                    borderRadius: '4px',
                    ...customization?.logoStyles,
                  }}
                  title={logo.description}
                />
              </Link>
            )}
          </Column>

          <Column
            style={{
              textAlign: 'right' as const,
              verticalAlign: 'middle' as const,
            }}
          >
            {/* User context display with modern styling */}
            {userContext?.displayName && (
              <div
                style={{
                  fontSize: tokens.typography?.sizes?.sm || '14px',
                  color:
                    variant === 'branded'
                      ? 'rgba(255, 255, 255, 0.9)'
                      : tokens.colors?.neutral?.[600] || '#6B7280',
                  fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                  fontWeight: '500',
                  letterSpacing: '-0.025em',
                  ...customization?.userContextStyles,
                }}
              >
                {userContext.displayName}
              </div>
            )}

            {/* Optional navigation with modern button styling */}
            {showNavigation && (
              <div
                style={{
                  fontSize: tokens.typography?.sizes?.sm || '14px',
                  marginTop: userContext?.displayName ? '8px' : '0',
                  ...customization?.navigationStyles,
                }}
              >
                <Link
                  href={`${DEFAULT_BASE_URL}/dashboard`}
                  style={{
                    color:
                      variant === 'branded'
                        ? 'rgba(255, 255, 255, 0.9)'
                        : tokens.colors?.brand?.['eleva-primary'] || '#006D77',
                    textDecoration: 'none',
                    marginRight: '16px',
                    fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                    fontWeight: '500',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor:
                      variant === 'branded' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    border:
                      variant === 'branded'
                        ? '1px solid rgba(255, 255, 255, 0.2)'
                        : `1px solid ${tokens.colors?.neutral?.[200] || '#E5E7EB'}`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  Dashboard
                </Link>
                <Link
                  href={`${DEFAULT_BASE_URL}/support`}
                  style={{
                    color:
                      variant === 'branded'
                        ? 'rgba(255, 255, 255, 0.9)'
                        : tokens.colors?.neutral?.[600] || '#6B7280',
                    textDecoration: 'none',
                    fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                    fontWeight: '500',
                    fontSize: '14px',
                  }}
                >
                  Support
                </Link>
              </div>
            )}
          </Column>
        </Row>
      </Container>
    </Section>
  );
}

export default EmailHeader;
