import { Column, Container, Img, Link, Row, Section } from '@react-email/components';
import React from 'react';

import { darkModeTokens, emailDesignTokens } from '../design-tokens';
import { EmailHeaderProps } from '../types';

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
  // Base URL for production vs development
  const baseURL =
    process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_BASE_URL || 'https://eleva.care'
      : '';

  const logoVariants = {
    light: {
      src: `${baseURL}/eleva-mark-color.png`,
      alt: 'Eleva Care Logo',
      description: 'Colored Eleva Care wellness logomark for light backgrounds',
    },
    dark: {
      src: `${baseURL}/eleva-mark-white.png`,
      alt: 'Eleva Care Logo',
      description: 'White Eleva Care wellness logomark for dark backgrounds',
    },
    contrast: {
      src: `${baseURL}/eleva-mark-black.png`,
      alt: 'Eleva Care Logo',
      description: 'High contrast black Eleva Care wellness logomark',
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

  // Variant-specific styling
  const variantStyles = {
    default: {
      backgroundColor: tokens.colors?.neutral?.[50] || '#F7F9F9',
      borderBottom: `2px solid ${tokens.colors?.neutral?.[200] || '#D1D1D1'}`,
    },
    minimal: {
      backgroundColor: 'transparent',
      borderBottom: 'none',
    },
    branded: {
      backgroundColor: tokens.colors?.brand?.['eleva-primary'] || '#006D77',
      borderBottom: `3px solid ${tokens.colors?.brand?.['eleva-secondary'] || '#E29578'}`,
    },
  } as const;

  const styles = variantStyles[variant || 'default'];

  return (
    <Section
      style={{
        ...styles,
        padding: '20px 0',
        width: '100%',
        ...customization?.containerStyles,
      }}
    >
      <Container
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '0 20px',
        }}
      >
        <Row>
          <Column
            style={{
              textAlign: 'left' as const,
              verticalAlign: 'middle' as const,
            }}
          >
            {showLogo && (
              <Link
                href={process.env.NEXT_PUBLIC_APP_URL || 'https://eleva.care'}
                style={{
                  display: 'inline-block',
                  textDecoration: 'none',
                }}
              >
                <Img
                  src={logo.src}
                  alt={logo.alt}
                  width="40"
                  height="40"
                  style={{
                    display: 'block',
                    outline: 'none',
                    border: 'none',
                    textDecoration: 'none',
                    verticalAlign: 'middle',
                    maxWidth: '40px',
                    height: 'auto',
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
            {/* User context display */}
            {userContext?.displayName && (
              <div
                style={{
                  fontSize: tokens.typography?.sizes?.sm || '14px',
                  color: tokens.colors?.neutral?.[600] || '#4B5563',
                  fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                  ...customization?.userContextStyles,
                }}
              >
                {userContext.displayName}
              </div>
            )}

            {/* Optional navigation for specific email types */}
            {showNavigation && (
              <div
                style={{
                  fontSize: tokens.typography?.sizes?.sm || '14px',
                  ...customization?.navigationStyles,
                }}
              >
                <Link
                  href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
                  style={{
                    color: tokens.colors?.brand?.['eleva-primary'] || '#006D77',
                    textDecoration: 'none',
                    marginLeft: '15px',
                    fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                  }}
                >
                  Dashboard
                </Link>
                <Link
                  href={`${process.env.NEXT_PUBLIC_APP_URL}/support`}
                  style={{
                    color: tokens.colors?.brand?.['eleva-primary'] || '#006D77',
                    textDecoration: 'none',
                    marginLeft: '15px',
                    fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
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
