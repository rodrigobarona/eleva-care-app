import { Img, Link, Section, Text } from '@react-email/components';
import React from 'react';

import { emailDesignTokens } from '../design-tokens';
import { SupportedLocale } from '../types';

interface EmailHeaderProps {
  brandName: string;
  logoUrl?: string;
  logoAlt?: string;
  locale: SupportedLocale;
  darkMode?: boolean;
  highContrast?: boolean;
  rtl?: boolean;
  showNavigation?: boolean;
  userContext?: {
    name: string;
    role: 'patient' | 'expert' | 'admin';
  };
}

/**
 * Email Header Component
 * Provides consistent branding and navigation for all email templates
 */
export const EmailHeader: React.FC<EmailHeaderProps> = ({
  brandName,
  logoUrl,
  logoAlt,
  locale,
  darkMode = false,
  highContrast = false,
  rtl = false,
  showNavigation = false,
  userContext,
}) => {
  const tokens = emailDesignTokens;

  // Default logo URL - you can replace this with your actual logo
  const defaultLogoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/images/email-logo.png`;
  const finalLogoUrl = logoUrl || defaultLogoUrl;
  const finalLogoAlt = logoAlt || `${brandName} logo`;

  // Localized text
  const getLocalizedText = (locale: SupportedLocale) => {
    const translations = {
      en: {
        goToWebsite: 'Go to website',
        dashboard: 'Dashboard',
        appointments: 'Appointments',
        profile: 'Profile',
        support: 'Support',
      },
      es: {
        goToWebsite: 'Ir al sitio web',
        dashboard: 'Panel',
        appointments: 'Citas',
        profile: 'Perfil',
        support: 'Soporte',
      },
      pt: {
        goToWebsite: 'Ir para o site',
        dashboard: 'Painel',
        appointments: 'Consultas',
        profile: 'Perfil',
        support: 'Suporte',
      },
      fr: {
        goToWebsite: 'Aller au site',
        dashboard: 'Tableau de bord',
        appointments: 'Rendez-vous',
        profile: 'Profil',
        support: 'Support',
      },
      de: {
        goToWebsite: 'Zur Website',
        dashboard: 'Dashboard',
        appointments: 'Termine',
        profile: 'Profil',
        support: 'Support',
      },
      ar: {
        goToWebsite: 'اذهب إلى الموقع',
        dashboard: 'لوحة القيادة',
        appointments: 'المواعيد',
        profile: 'الملف الشخصي',
        support: 'الدعم',
      },
      he: {
        goToWebsite: 'עבור לאתר',
        dashboard: 'לוח בקרה',
        appointments: 'פגישות',
        profile: 'פרופיל',
        support: 'תמיכה',
      },
    };

    return translations[locale] || translations.en;
  };

  const t = getLocalizedText(locale);

  // Header styles
  const headerStyles: React.CSSProperties = {
    backgroundColor: darkMode ? tokens.colors.neutral[100] : '#FFFFFF',
    borderBottom: `1px solid ${darkMode ? tokens.colors.neutral[200] : tokens.colors.neutral[200]}`,
    padding: tokens.spacing.lg,
    textAlign: rtl ? 'right' : 'left',
  };

  const logoStyles: React.CSSProperties = {
    height: '40px',
    width: 'auto',
    maxWidth: '200px',
  };

  const brandTextStyles: React.CSSProperties = {
    color: highContrast ? tokens.colors.neutral[900] : tokens.colors.brand['health-primary'],
    fontSize: tokens.typography.sizes['2xl'],
    fontWeight: tokens.typography.weights.bold,
    margin: '0',
    textDecoration: 'none',
  };

  const navigationStyles: React.CSSProperties = {
    marginTop: tokens.spacing.md,
    borderTop: `1px solid ${tokens.colors.neutral[200]}`,
    paddingTop: tokens.spacing.md,
  };

  const navLinkStyles: React.CSSProperties = {
    color: darkMode ? tokens.colors.neutral[700] : tokens.colors.neutral[600],
    fontSize: tokens.typography.sizes.sm,
    textDecoration: 'none',
    marginRight: rtl ? '0' : tokens.spacing.md,
    marginLeft: rtl ? tokens.spacing.md : '0',
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    borderRadius: tokens.borderRadius.sm,
  };

  const userContextStyles: React.CSSProperties = {
    color: tokens.colors.neutral[600],
    fontSize: tokens.typography.sizes.sm,
    margin: '0',
    marginTop: tokens.spacing.sm,
  };

  return (
    <Section
      style={headerStyles}
      className={`email-header ${darkMode ? 'dark-mode-bg' : ''} ${highContrast ? 'high-contrast' : ''}`}
      role="banner"
      aria-label="Email header"
    >
      {/* Logo and Brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: rtl ? 'flex-end' : 'flex-start',
        }}
      >
        {finalLogoUrl ? (
          <Link
            href={process.env.NEXT_PUBLIC_APP_URL}
            style={{ textDecoration: 'none' }}
            aria-label={t.goToWebsite}
          >
            <Img src={finalLogoUrl} alt={finalLogoAlt} style={logoStyles} className="email-logo" />
          </Link>
        ) : (
          <Link
            href={process.env.NEXT_PUBLIC_APP_URL}
            style={brandTextStyles}
            aria-label={t.goToWebsite}
            className={highContrast ? 'high-contrast-text' : ''}
          >
            {brandName}
          </Link>
        )}

        {/* User Context */}
        {userContext && (
          <div style={{ marginLeft: rtl ? '0' : 'auto', marginRight: rtl ? 'auto' : '0' }}>
            <Text style={userContextStyles}>
              {userContext.role === 'patient' &&
                (locale === 'en'
                  ? 'Patient'
                  : locale === 'es'
                    ? 'Paciente'
                    : locale === 'pt'
                      ? 'Paciente'
                      : locale === 'fr'
                        ? 'Patient'
                        : locale === 'de'
                          ? 'Patient'
                          : locale === 'ar'
                            ? 'مريض'
                            : locale === 'he'
                              ? 'מטופל'
                              : 'Patient')}
              : {userContext.name}
            </Text>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      {showNavigation && (
        <nav style={navigationStyles} role="navigation" aria-label="Email navigation">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
              style={navLinkStyles}
              className="email-nav-link"
              aria-label={t.dashboard}
            >
              {t.dashboard}
            </Link>

            <Link
              href={`${process.env.NEXT_PUBLIC_APP_URL}/appointments`}
              style={navLinkStyles}
              className="email-nav-link"
              aria-label={t.appointments}
            >
              {t.appointments}
            </Link>

            <Link
              href={`${process.env.NEXT_PUBLIC_APP_URL}/profile`}
              style={navLinkStyles}
              className="email-nav-link"
              aria-label={t.profile}
            >
              {t.profile}
            </Link>

            <Link
              href={`${process.env.NEXT_PUBLIC_APP_URL}/support`}
              style={navLinkStyles}
              className="email-nav-link"
              aria-label={t.support}
            >
              {t.support}
            </Link>
          </div>
        </nav>
      )}

      {/* Accessibility enhancements */}
      <style>{`
        .email-logo:hover {
          opacity: 0.8;
          transition: opacity 0.2s ease;
        }
        
        .email-nav-link:hover {
          background-color: ${tokens.colors.neutral[100]};
          color: ${tokens.colors.brand['health-primary']};
          transition: all 0.2s ease;
        }
        
        .email-nav-link:focus {
          outline: 2px solid ${tokens.colors.brand['health-primary']};
          outline-offset: 2px;
        }
        
        /* High contrast mode specific styles */
        .high-contrast .email-nav-link {
          border: 1px solid ${tokens.colors.neutral[900]};
          color: ${tokens.colors.neutral[900]} !important;
        }
        
        .high-contrast .email-nav-link:hover {
          background-color: ${tokens.colors.neutral[900]};
          color: #FFFFFF !important;
        }
        
        /* Mobile responsive adjustments */
        @media screen and (max-width: 600px) {
          .email-header {
            padding: ${tokens.spacing.md} !important;
          }
          
          .email-nav-link {
            margin-bottom: ${tokens.spacing.sm} !important;
            display: block !important;
            text-align: center !important;
          }
        }
      `}</style>
    </Section>
  );
};

export default EmailHeader;
