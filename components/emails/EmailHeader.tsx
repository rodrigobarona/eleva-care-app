import * as React from 'react';
import { Column, Container, Img, Link, Row, Section } from '@react-email/components';

export interface EmailHeaderProps {
  variant?: 'default' | 'minimal' | 'branded';
  showLogo?: boolean;
  showNavigation?: boolean;
  theme?: 'light' | 'dark';
  userContext?: {
    displayName?: string;
  };
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
  userContext,
}: EmailHeaderProps) {
  const isDark = theme === 'dark';

  // Get logo based on theme
  const logoSrc = isDark
    ? `${DEFAULT_BASE_URL}/eleva-logo-white.png`
    : `${DEFAULT_BASE_URL}/eleva-logo-color.png`;

  // Variant-specific styles
  const variantStyles = {
    default: {
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #F3F4F6',
      padding: '24px 0',
    },
    minimal: {
      backgroundColor: 'transparent',
      borderBottom: 'none',
      padding: '16px 0',
    },
    branded: {
      backgroundColor: '#006D77',
      borderBottom: 'none',
      padding: '24px 0',
    },
  };

  const styles = variantStyles[variant];
  const textColor =
    variant === 'branded' ? 'rgba(255, 255, 255, 0.9)' : isDark ? '#E5E7EB' : '#374151';

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
            {userContext?.displayName && (
              <div
                style={{
                  fontSize: '14px',
                  color: textColor,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: '500',
                }}
              >
                {userContext.displayName}
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
                  Dashboard
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
