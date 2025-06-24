import { Column, Container, Hr, Img, Link, Row, Section, Text } from '@react-email/components';
import React from 'react';

import { darkModeTokens, emailDesignTokens } from '../design-tokens';
import { CustomLink, EmailFooterProps, SupportedLocale } from '../types';
import { normalizeLocale } from '../utils/translations';

// Centralized URL configuration
const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://eleva.care';

/**
 * Get appropriate footer logo variant
 */
function getFooterLogoVariant(theme: 'light' | 'dark' | 'auto' = 'auto') {
  // Always use absolute URLs for email clients - they don't support relative URLs
  const baseURL = DEFAULT_BASE_URL;

  // For footer, use full logo in a more subdued style
  const variants = {
    light: `${baseURL}/eleva-logo-color.png`, // Colored full logo for light backgrounds
    dark: `${baseURL}/eleva-logo-white.png`, // White full logo for dark backgrounds
    auto: `${baseURL}/eleva-logo-color.png`, // Default to colored
  };

  return variants[theme] || variants.light;
}

/**
 * Email Footer Component with Eleva Care branding
 * Includes legal compliance, unsubscribe, and contact information
 */
export function EmailFooter({
  variant = 'default',
  showLogo = true,
  showSocialLinks = true,
  showUnsubscribe = true,
  showContactInfo = true,
  language = 'en',
  theme = 'light',
  userPreferences = {},
  customization = {},
  customLinks = [],
  companyName,
  tagline,
  supportEmail,
}: EmailFooterProps) {
  const locale = normalizeLocale(language) as SupportedLocale;
  const logoSrc = getFooterLogoVariant(theme);
  const isDark = theme === 'dark';
  const tokens = isDark ? darkModeTokens : emailDesignTokens;
  const currentYear = new Date().getFullYear();

  // Configurable company information with fallbacks
  const finalCompanyName = companyName || process.env.COMPANY_NAME || 'Eleva Care';
  const finalTagline = tagline || process.env.COMPANY_TAGLINE || "Expert care for women's health";
  const finalSupportEmail = supportEmail || process.env.SUPPORT_EMAIL || 'support@eleva.care';

  // Variant-specific styling with modern improvements
  const variantStyles = {
    default: {
      backgroundColor: '#FAFBFC',
      borderTop: `1px solid ${tokens.colors?.neutral?.[100] || '#F3F4F6'}`,
    },
    minimal: {
      backgroundColor: 'transparent',
      borderTop: 'none',
    },
    branded: {
      backgroundColor: tokens.colors?.brand?.['eleva-primary'] || '#006D77',
      borderTop: 'none',
    },
  } satisfies Record<string, React.CSSProperties>;

  const styles = variantStyles[variant];
  const isMinimal = variant === 'minimal';
  const isBranded = variant === 'branded';

  // Base URLs
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_BASE_URL;
  const unsubscribeUrl = userPreferences.unsubscribeUrl || `${baseUrl}/unsubscribe`;

  // Synchronous translation loading for server-side rendering
  // Static translations by locale to avoid dynamic imports and support email rendering
  const staticTranslations = {
    en: {
      unsubscribe: 'Unsubscribe',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      contactUs: 'Contact Us',
      allRightsReserved: 'All rights reserved',
      followUs: 'Follow us',
    },
    es: {
      unsubscribe: 'Cancelar suscripción',
      privacyPolicy: 'Política de Privacidad',
      termsOfService: 'Términos de Servicio',
      contactUs: 'Contáctanos',
      allRightsReserved: 'Todos los derechos reservados',
      followUs: 'Síguenos',
    },
    pt: {
      unsubscribe: 'Cancelar subscrição',
      privacyPolicy: 'Política de Privacidade',
      termsOfService: 'Termos de Serviço',
      contactUs: 'Contacte-nos',
      allRightsReserved: 'Todos os direitos reservados',
      followUs: 'Siga-nos',
    },
    'pt-BR': {
      unsubscribe: 'Cancelar inscrição',
      privacyPolicy: 'Política de Privacidade',
      termsOfService: 'Termos de Serviço',
      contactUs: 'Entre em contato',
      allRightsReserved: 'Todos os direitos reservados',
      followUs: 'Siga-nos',
    },
  } as const;

  const texts = staticTranslations[locale] || staticTranslations.en;

  // Modern color scheme
  const textColors = {
    primary: isBranded ? 'rgba(255, 255, 255, 0.95)' : tokens.colors?.neutral?.[700] || '#374151',
    secondary: isBranded ? 'rgba(255, 255, 255, 0.8)' : tokens.colors?.neutral?.[500] || '#6B7280',
    muted: isBranded ? 'rgba(255, 255, 255, 0.6)' : tokens.colors?.neutral?.[400] || '#9CA3AF',
    link: isBranded
      ? 'rgba(255, 255, 255, 0.9)'
      : tokens.colors?.brand?.['eleva-primary'] || '#006D77',
  };

  return (
    <Section
      style={{
        ...styles,
        padding: isMinimal ? '24px 0' : '40px 0 32px 0',
        marginTop: isMinimal ? '24px' : '40px',
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
        {/* Main Footer Content with improved layout */}
        <Row>
          {/* Logo and Company Info */}
          <Column
            style={{
              width: '60%',
              verticalAlign: 'top' as const,
              paddingRight: '24px',
            }}
          >
            {showLogo && (
              <div style={{ marginBottom: '20px' }}>
                <Img
                  src={logoSrc}
                  alt="Eleva Care"
                  width="100"
                  height="26"
                  style={{
                    display: 'block',
                    outline: 'none',
                    border: 'none',
                    maxWidth: '100px',
                    height: 'auto',
                    borderRadius: '4px',
                    ...customization?.logoStyles,
                  }}
                />
              </div>
            )}

            <Text
              style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                lineHeight: '1.5',
                color: textColors.primary,
                fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                fontWeight: '600',
                letterSpacing: '-0.025em',
              }}
            >
              {finalCompanyName}
            </Text>

            <Text
              style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                lineHeight: '1.6',
                color: textColors.secondary,
                fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                fontWeight: '400',
              }}
            >
              {finalTagline}
            </Text>

            {showContactInfo && (
              <Text
                style={{
                  margin: '0',
                  fontSize: '14px',
                  color: textColors.secondary,
                  fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                }}
              >
                <Link
                  href={`mailto:${finalSupportEmail}`}
                  style={{
                    color: textColors.link,
                    textDecoration: 'none',
                    fontWeight: '500',
                    borderBottom: isBranded
                      ? 'none'
                      : `1px solid ${tokens.colors?.neutral?.[200] || '#E5E7EB'}`,
                    paddingBottom: '1px',
                  }}
                >
                  {finalSupportEmail}
                </Link>
              </Text>
            )}
          </Column>

          {/* Links and Actions */}
          <Column
            style={{
              width: '40%',
              verticalAlign: 'top' as const,
              textAlign: 'right' as const,
            }}
          >
            {/* Legal Links with modern spacing */}
            <div style={{ marginBottom: '20px' }}>
              <Link
                href={`${baseUrl}/legal/privacy`}
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: textColors.secondary,
                  textDecoration: 'none',
                  fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                  marginBottom: '8px',
                  fontWeight: '500',
                }}
              >
                {texts.privacyPolicy}
              </Link>
              <Link
                href={`${baseUrl}/legal/terms`}
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: textColors.secondary,
                  textDecoration: 'none',
                  fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                  marginBottom: '8px',
                  fontWeight: '500',
                }}
              >
                {texts.termsOfService}
              </Link>
            </div>

            {/* Custom links */}
            {customLinks.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                {customLinks.map((link: CustomLink, index: number) => (
                  <Link
                    key={index}
                    href={link.url}
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      color: textColors.secondary,
                      textDecoration: 'none',
                      marginBottom: '8px',
                      fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                      fontWeight: '500',
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Social Links with modern styling */}
            {showSocialLinks && customization?.socialLinks?.length && (
              <div style={{ marginBottom: '20px' }}>
                <Text
                  style={{
                    fontSize: '13px',
                    color: textColors.muted,
                    margin: '0 0 12px 0',
                    fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                    fontWeight: '500',
                    letterSpacing: '0.025em',
                    textTransform: 'uppercase' as const,
                  }}
                >
                  {texts.followUs}
                </Text>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  {customization.socialLinks.map((link, index) => (
                    <Link
                      key={index}
                      href={link.url}
                      style={{
                        fontSize: '13px',
                        color: textColors.link,
                        textDecoration: 'none',
                        fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                        fontWeight: '500',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: isBranded ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                        border: isBranded
                          ? 'none'
                          : `1px solid ${tokens.colors?.neutral?.[200] || '#E5E7EB'}`,
                      }}
                    >
                      {link.label || link.platform}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </Column>
        </Row>

        {/* Divider with subtle styling */}
        <Hr
          style={{
            border: 'none',
            borderTop: `1px solid ${isBranded ? 'rgba(255, 255, 255, 0.2)' : tokens.colors?.neutral?.[100] || '#F3F4F6'}`,
            margin: '32px 0 24px 0',
            width: '100%',
          }}
        />

        {/* Bottom Row with modern layout */}
        <Row>
          <Column
            style={{
              width: '70%',
              textAlign: 'left' as const,
              verticalAlign: 'middle' as const,
            }}
          >
            <Text
              style={{
                margin: '0',
                fontSize: '12px',
                color: textColors.muted,
                fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                lineHeight: '1.5',
                ...customization?.copyrightStyles,
              }}
            >
              © {currentYear} {finalCompanyName}. {texts.allRightsReserved}.
            </Text>
          </Column>

          <Column
            style={{
              width: '30%',
              textAlign: 'right' as const,
              verticalAlign: 'middle' as const,
            }}
          >
            {showUnsubscribe && (
              <Link
                href={unsubscribeUrl}
                style={{
                  fontSize: '12px',
                  color: textColors.muted,
                  textDecoration: 'none',
                  fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                  fontWeight: '500',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: `1px solid ${isBranded ? 'rgba(255, 255, 255, 0.2)' : tokens.colors?.neutral?.[200] || '#E5E7EB'}`,
                  backgroundColor: isBranded ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  ...customization?.unsubscribeStyles,
                }}
              >
                {texts.unsubscribe}
              </Link>
            )}
          </Column>
        </Row>
      </Container>
    </Section>
  );
}

export default EmailFooter;
