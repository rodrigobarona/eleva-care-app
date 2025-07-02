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
 */
export function EmailHeader({
  variant = 'default',
  showLogo = true,
  showNavigation = false,
  theme = 'light',
  emailContext,
  userRole,
  highContrast,
}: EmailHeaderProps) {
  const isDark = theme === 'dark';

  // Get logo based on theme
  const logoSrc = isDark
    ? `${DEFAULT_BASE_URL}/eleva-logo-white.png`
    : `${DEFAULT_BASE_URL}/eleva-logo-color.png`;

  // Use theme colors from emailContext if available
  const themeColors = emailContext?.theme?.colors;

  // Adjust colors for high contrast mode
  const colors = highContrast
    ? {
        background: isDark ? '#000000' : '#FFFFFF',
        border: isDark ? '#FFFFFF' : '#000000',
        primary: isDark ? '#FFFFFF' : '#000000',
        text: {
          primary: isDark ? '#FFFFFF' : '#000000',
        },
      }
    : themeColors;

  // Variant-specific styles with theme support
  const variantStyles = {
    default: {
      backgroundColor: colors?.background || '#FFFFFF',
      borderBottom: `1px solid ${colors?.border || '#F3F4F6'}`,
      padding: '24px 0',
    },
    minimal: {
      backgroundColor: 'transparent',
      borderBottom: 'none',
      padding: '16px 0',
    },
    branded: {
      backgroundColor: colors?.primary || '#006D77',
      borderBottom: 'none',
      padding: '24px 0',
    },
  };

  const styles = variantStyles[variant];
  const textColor =
    variant === 'branded'
      ? 'rgba(255, 255, 255, 0.9)'
      : colors?.text?.primary || (isDark ? '#E5E7EB' : '#374151');

  // Navigation labels (could be internationalized)
  const navLabels = {
    dashboard: 'Dashboard',
    support: 'Support',
  };

  return (
    <Section style={styles}>
      <Container
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        <Row>
          <Column style={{ textAlign: 'left', verticalAlign: 'middle' }}>
            {showLogo && (
              <Link
                href={DEFAULT_BASE_URL}
                style={{ display: 'inline-block', textDecoration: 'none' }}
              >
                <Img
                  src={logoSrc}
                  alt="Eleva Care"
                  width="120"
                  height="32"
                  style={{
                    display: 'block',
                    outline: 'none',
                    border: 'none',
                    maxWidth: '120px',
                    height: 'auto',
                  }}
                />
              </Link>
            )}
          </Column>

          <Column style={{ textAlign: 'right', verticalAlign: 'middle' }}>
            {userRole && (
              <div
                style={{
                  fontSize: '14px',
                  color: textColor,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: '500',
                }}
              >
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </div>
            )}

            {showNavigation && (
              <div style={{ fontSize: '14px', marginTop: '8px' }}>
                <Link
                  href={`${DEFAULT_BASE_URL}/dashboard`}
                  style={{
                    color: textColor,
                    textDecoration: 'none',
                    marginRight: '16px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: '500',
                  }}
                >
                  {navLabels.dashboard}
                </Link>
                <Link
                  href={`${DEFAULT_BASE_URL}/support`}
                  style={{
                    color: textColor,
                    textDecoration: 'none',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: '500',
                  }}
                >
                  {navLabels.support}
                </Link>
              </div>
            )}
          </Column>
        </Row>
      </Container>
    </Section>
  );
}
