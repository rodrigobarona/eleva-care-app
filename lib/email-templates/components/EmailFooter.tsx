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

  // For footer, typically use a more subdued version
  const variants = {
    light: `${baseURL}/eleva-mark-color.png`, // Colored version for light backgrounds
    dark: `${baseURL}/eleva-mark-white.png`, // White version for dark backgrounds
    auto: `${baseURL}/eleva-mark-color.png`, // Default to colored
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
}: EmailFooterProps) {
  const locale = normalizeLocale(language) as SupportedLocale;
  const logoSrc = getFooterLogoVariant(theme);
  const isDark = theme === 'dark';
  const tokens = isDark ? darkModeTokens : emailDesignTokens;
  const currentYear = new Date().getFullYear();

  // Variant-specific styling
  const variantStyles = {
    default: {
      backgroundColor: tokens.colors?.neutral?.[50] || '#F7F9F9',
      borderTop: `1px solid ${tokens.colors?.neutral?.[200] || '#D1D1D1'}`,
    },
    minimal: {
      backgroundColor: 'transparent',
      borderTop: 'none',
    },
    branded: {
      backgroundColor: tokens.colors?.brand?.['eleva-primary'] || '#006D77',
      borderTop: `2px solid ${tokens.colors?.brand?.['eleva-secondary'] || '#E29578'}`,
    },
  } satisfies Record<string, React.CSSProperties>;

  const styles = variantStyles[variant];

  // Base URLs
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_BASE_URL;
  const unsubscribeUrl = userPreferences.unsubscribeUrl || `${baseUrl}/unsubscribe`;

  // Default translations (fallback if translation system fails)
  const defaultTexts = {
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
  };

  const texts = defaultTexts[locale] || defaultTexts.en;

  return (
    <Section
      style={{
        ...styles,
        padding: '30px 0',
        marginTop: '40px',
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
        {/* Main Footer Content */}
        <Row>
          {/* Logo and Company Info */}
          <Column
            style={{
              width: '50%',
              verticalAlign: 'top' as const,
            }}
          >
            {showLogo && (
              <Img
                src={logoSrc}
                alt="Eleva Care"
                width="32"
                height="32"
                style={{
                  display: 'block',
                  marginBottom: '15px',
                  outline: 'none',
                  border: 'none',
                  ...customization?.logoStyles,
                }}
              />
            )}

            <Text
              style={{
                margin: '0 0 10px 0',
                fontSize: tokens.typography?.sizes?.sm || '14px',
                lineHeight: '1.4',
                color: tokens.colors?.neutral?.[600] || '#4B5563',
                fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
              }}
            >
              Eleva Care
            </Text>

            <Text
              style={{
                margin: '0 0 15px 0',
                fontSize: tokens.typography?.sizes?.xs || '12px',
                lineHeight: '1.4',
                color: tokens.colors?.neutral?.[500] || '#6B7280',
                fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
              }}
            >
              Expert care for women&apos;s health
            </Text>

            {showContactInfo && (
              <Text
                style={{
                  margin: '0',
                  fontSize: tokens.typography?.sizes?.xs || '12px',
                  color: tokens.colors?.neutral?.[500] || '#6B7280',
                  fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                }}
              >
                <Link
                  href="mailto:support@eleva.care"
                  style={{
                    color: tokens.colors?.brand?.['eleva-primary'] || '#006D77',
                    textDecoration: 'none',
                  }}
                >
                  support@eleva.care
                </Link>
              </Text>
            )}
          </Column>

          {/* Links and Actions */}
          <Column
            style={{
              width: '50%',
              verticalAlign: 'top' as const,
              textAlign: 'right' as const,
            }}
          >
            {/* Legal Links */}
            <div style={{ marginBottom: '15px' }}>
              <Link
                href={`${baseUrl}/legal/privacy`}
                style={{
                  fontSize: tokens.typography?.sizes?.xs || '12px',
                  color: tokens.colors?.neutral?.[600] || '#4B5563',
                  textDecoration: 'none',
                  fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                  marginLeft: '15px',
                }}
              >
                {texts.privacyPolicy}
              </Link>
              <Link
                href={`${baseUrl}/legal/terms`}
                style={{
                  fontSize: tokens.typography?.sizes?.xs || '12px',
                  color: tokens.colors?.neutral?.[600] || '#4B5563',
                  textDecoration: 'none',
                  fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                  marginLeft: '15px',
                }}
              >
                {texts.termsOfService}
              </Link>
            </div>

            {/* Custom links */}
            {customLinks.map((link: CustomLink, index: number) => (
              <Link
                key={index}
                href={link.url}
                style={{
                  display: 'block',
                  fontSize: tokens.typography?.sizes?.xs || '12px',
                  color: tokens.colors?.neutral?.[600] || '#4B5563',
                  textDecoration: 'none',
                  marginBottom: '5px',
                  fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                }}
              >
                {link.label}
              </Link>
            ))}

            {/* Social Links */}
            {showSocialLinks && customization?.socialLinks?.length && (
              <div style={{ marginTop: '15px' }}>
                <Text
                  style={{
                    fontSize: tokens.typography?.sizes?.xs || '12px',
                    color: tokens.colors?.neutral?.[500] || '#6B7280',
                    margin: '0 0 10px 0',
                    fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                  }}
                >
                  {texts.followUs}
                </Text>
                {customization.socialLinks.map((link, index) => (
                  <Link
                    key={index}
                    href={link.url}
                    style={{
                      fontSize: tokens.typography?.sizes?.xs || '12px',
                      color: tokens.colors?.brand?.['eleva-primary'] || '#006D77',
                      textDecoration: 'none',
                      marginRight: '15px',
                      fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                    }}
                  >
                    {link.label || link.platform}
                  </Link>
                ))}
              </div>
            )}
          </Column>
        </Row>

        {/* Divider */}
        <Hr
          style={{
            border: 'none',
            borderTop: `1px solid ${tokens.colors?.neutral?.[200] || '#D1D1D1'}`,
            margin: '25px 0 20px 0',
            width: '100%',
          }}
        />

        {/* Bottom Row */}
        <Row>
          <Column
            style={{
              width: '70%',
              textAlign: 'left' as const,
            }}
          >
            <Text
              style={{
                margin: '0',
                fontSize: tokens.typography?.sizes?.xs || '12px',
                color: tokens.colors?.neutral?.[500] || '#6B7280',
                fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
                ...customization?.copyrightStyles,
              }}
            >
              © {currentYear} Eleva Care. {texts.allRightsReserved}.
            </Text>
          </Column>

          <Column
            style={{
              width: '30%',
              textAlign: 'right' as const,
            }}
          >
            {showUnsubscribe && (
              <Link
                href={unsubscribeUrl}
                style={{
                  fontSize: tokens.typography?.sizes?.xs || '12px',
                  color: tokens.colors?.neutral?.[500] || '#6B7280',
                  textDecoration: 'underline',
                  fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
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
