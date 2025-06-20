import { Hr, Link, Section, Text } from '@react-email/components';
import React from 'react';

import { emailDesignTokens } from '../design-tokens';
import { SupportedLocale } from '../types';

interface EmailFooterProps {
  companyName: string;
  year: number;
  locale: SupportedLocale;
  darkMode?: boolean;
  highContrast?: boolean;
  rtl?: boolean;
  unsubscribeUrl?: string;
  contactEmail?: string;
  address?: string;
  showSocialLinks?: boolean;
  customFooterText?: string;
}

/**
 * Email Footer Component
 * Provides consistent footer with legal compliance, contact info, and unsubscribe
 */
export const EmailFooter: React.FC<EmailFooterProps> = ({
  companyName,
  year,
  locale,
  darkMode = false,
  highContrast = false,
  rtl = false,
  unsubscribeUrl,
  contactEmail = 'support@eleva.care',
  address = 'Rua Example, 123, 1234-567 Lisboa, Portugal',
  showSocialLinks = true,
  customFooterText,
}) => {
  const tokens = emailDesignTokens;

  // Localized text
  const getLocalizedText = (locale: SupportedLocale) => {
    const translations = {
      en: {
        allRightsReserved: 'All rights reserved.',
        privacyPolicy: 'Privacy Policy',
        termsOfService: 'Terms of Service',
        unsubscribe: 'Unsubscribe',
        contactUs: 'Contact Us',
        helpCenter: 'Help Center',
        manageCommunications: 'Manage email preferences',
        poweredBy: 'Powered by Eleva.care',
        complianceText: 'This email was sent in accordance with applicable privacy laws.',
        address: 'Address:',
        phone: 'Phone:',
        email: 'Email:',
        followUs: 'Follow us:',
        linkedin: 'LinkedIn',
        twitter: 'Twitter',
        facebook: 'Facebook',
        instagram: 'Instagram',
        gdprCompliance: 'GDPR Compliant | SOC 2 Certified | HIPAA Compliant',
      },
      es: {
        allRightsReserved: 'Todos los derechos reservados.',
        privacyPolicy: 'Política de Privacidad',
        termsOfService: 'Términos de Servicio',
        unsubscribe: 'Darse de baja',
        contactUs: 'Contáctanos',
        helpCenter: 'Centro de Ayuda',
        manageCommunications: 'Gestionar preferencias de email',
        poweredBy: 'Desarrollado por Eleva.care',
        complianceText: 'Este email fue enviado de acuerdo con las leyes de privacidad aplicables.',
        address: 'Dirección:',
        phone: 'Teléfono:',
        email: 'Email:',
        followUs: 'Síguenos:',
        linkedin: 'LinkedIn',
        twitter: 'Twitter',
        facebook: 'Facebook',
        instagram: 'Instagram',
        gdprCompliance: 'Cumple GDPR | Certificado SOC 2 | Cumple HIPAA',
      },
      pt: {
        allRightsReserved: 'Todos os direitos reservados.',
        privacyPolicy: 'Política de Privacidade',
        termsOfService: 'Termos de Serviço',
        unsubscribe: 'Cancelar subscrição',
        contactUs: 'Contacte-nos',
        helpCenter: 'Centro de Ajuda',
        manageCommunications: 'Gerir preferências de email',
        poweredBy: 'Desenvolvido pela Eleva.care',
        complianceText: 'Este email foi enviado de acordo com as leis de privacidade aplicáveis.',
        address: 'Morada:',
        phone: 'Telefone:',
        email: 'Email:',
        followUs: 'Siga-nos:',
        linkedin: 'LinkedIn',
        twitter: 'Twitter',
        facebook: 'Facebook',
        instagram: 'Instagram',
        gdprCompliance: 'Conforme GDPR | Certificado SOC 2 | Conforme HIPAA',
      },
      fr: {
        allRightsReserved: 'Tous droits réservés.',
        privacyPolicy: 'Politique de Confidentialité',
        termsOfService: 'Conditions de Service',
        unsubscribe: 'Se désabonner',
        contactUs: 'Nous contacter',
        helpCenter: "Centre d'aide",
        manageCommunications: 'Gérer les préférences email',
        poweredBy: 'Propulsé par Eleva.care',
        complianceText:
          'Cet email a été envoyé conformément aux lois de confidentialité applicables.',
        address: 'Adresse:',
        phone: 'Téléphone:',
        email: 'Email:',
        followUs: 'Suivez-nous:',
        linkedin: 'LinkedIn',
        twitter: 'Twitter',
        facebook: 'Facebook',
        instagram: 'Instagram',
        gdprCompliance: 'Conforme GDPR | Certifié SOC 2 | Conforme HIPAA',
      },
      de: {
        allRightsReserved: 'Alle Rechte vorbehalten.',
        privacyPolicy: 'Datenschutzrichtlinie',
        termsOfService: 'Nutzungsbedingungen',
        unsubscribe: 'Abmelden',
        contactUs: 'Kontakt',
        helpCenter: 'Hilfe-Center',
        manageCommunications: 'Email-Einstellungen verwalten',
        poweredBy: 'Betrieben von Eleva.care',
        complianceText: 'Diese E-Mail wurde gemäß den geltenden Datenschutzgesetzen versendet.',
        address: 'Adresse:',
        phone: 'Telefon:',
        email: 'E-Mail:',
        followUs: 'Folgen Sie uns:',
        linkedin: 'LinkedIn',
        twitter: 'Twitter',
        facebook: 'Facebook',
        instagram: 'Instagram',
        gdprCompliance: 'DSGVO-konform | SOC 2 zertifiziert | HIPAA-konform',
      },
      ar: {
        allRightsReserved: 'جميع الحقوق محفوظة.',
        privacyPolicy: 'سياسة الخصوصية',
        termsOfService: 'شروط الخدمة',
        unsubscribe: 'إلغاء الاشتراك',
        contactUs: 'اتصل بنا',
        helpCenter: 'مركز المساعدة',
        manageCommunications: 'إدارة تفضيلات البريد الإلكتروني',
        poweredBy: 'مدعوم من Eleva.care',
        complianceText: 'تم إرسال هذا البريد الإلكتروني وفقاً لقوانين الخصوصية المعمول بها.',
        address: 'العنوان:',
        phone: 'الهاتف:',
        email: 'البريد الإلكتروني:',
        followUs: 'تابعنا:',
        linkedin: 'لينكد إن',
        twitter: 'تويتر',
        facebook: 'فيسبوك',
        instagram: 'إنستغرام',
        gdprCompliance: 'متوافق مع GDPR | معتمد SOC 2 | متوافق مع HIPAA',
      },
      he: {
        allRightsReserved: 'כל הזכויות שמורות.',
        privacyPolicy: 'מדיניות פרטיות',
        termsOfService: 'תנאי שירות',
        unsubscribe: 'ביטול מנוי',
        contactUs: 'צור קשר',
        helpCenter: 'מרכז עזרה',
        manageCommunications: 'ניהול העדפות אימייל',
        poweredBy: 'מופעל על ידי Eleva.care',
        complianceText: 'הודעה זו נשלחה בהתאם לחוקי הפרטיות הרלוונטיים.',
        address: 'כתובת:',
        phone: 'טלפון:',
        email: 'אימייל:',
        followUs: 'עקבו אחרינו:',
        linkedin: 'לינקדאין',
        twitter: 'טוויטר',
        facebook: 'פייסבוק',
        instagram: 'אינסטגרם',
        gdprCompliance: 'תואם GDPR | מוסמך SOC 2 | תואם HIPAA',
      },
    };

    return translations[locale] || translations.en;
  };

  const t = getLocalizedText(locale);

  // Footer styles
  const footerStyles: React.CSSProperties = {
    backgroundColor: darkMode ? tokens.colors.neutral[100] : tokens.colors.neutral[50],
    padding: tokens.spacing.lg,
    marginTop: tokens.spacing.xl,
    textAlign: rtl ? 'right' : 'left',
  };

  const dividerStyles: React.CSSProperties = {
    borderColor: darkMode ? tokens.colors.neutral[300] : tokens.colors.neutral[200],
    margin: `${tokens.spacing.lg} 0`,
  };

  const footerTextStyles: React.CSSProperties = {
    color: darkMode ? tokens.colors.neutral[600] : tokens.colors.neutral[500],
    fontSize: tokens.typography.sizes.sm,
    lineHeight: tokens.typography.lineHeights.relaxed,
    margin: `${tokens.spacing.sm} 0`,
  };

  const linkStyles: React.CSSProperties = {
    color: highContrast ? tokens.colors.neutral[900] : tokens.colors.brand['health-primary'],
    textDecoration: 'none',
    marginRight: rtl ? '0' : tokens.spacing.md,
    marginLeft: rtl ? tokens.spacing.md : '0',
    fontSize: tokens.typography.sizes.sm,
  };

  const copyrightStyles: React.CSSProperties = {
    color: darkMode ? tokens.colors.neutral[600] : tokens.colors.neutral[400],
    fontSize: tokens.typography.sizes.xs,
    textAlign: 'center',
    margin: `${tokens.spacing.lg} 0 0 0`,
  };

  const socialLinkStyles: React.CSSProperties = {
    color: tokens.colors.neutral[500],
    textDecoration: 'none',
    marginRight: rtl ? '0' : tokens.spacing.sm,
    marginLeft: rtl ? tokens.spacing.sm : '0',
    fontSize: tokens.typography.sizes.sm,
  };

  const complianceStyles: React.CSSProperties = {
    color: tokens.colors.neutral[400],
    fontSize: tokens.typography.sizes.xs,
    textAlign: 'center',
    margin: `${tokens.spacing.md} 0 0 0`,
    fontWeight: tokens.typography.weights.medium,
  };

  return (
    <Section
      style={footerStyles}
      className={`email-footer ${darkMode ? 'dark-mode-bg' : ''} ${highContrast ? 'high-contrast' : ''}`}
      role="contentinfo"
      aria-label="Email footer"
    >
      <Hr style={dividerStyles} />

      {/* Contact Information */}
      <div style={{ marginBottom: tokens.spacing.lg }}>
        <Text style={footerTextStyles}>
          <strong>{t.address}</strong> {address}
        </Text>
        <Text style={footerTextStyles}>
          <strong>{t.email}</strong>{' '}
          <Link href={`mailto:${contactEmail}`} style={linkStyles}>
            {contactEmail}
          </Link>
        </Text>
      </div>

      {/* Navigation Links */}
      <div style={{ marginBottom: tokens.spacing.lg }}>
        <nav role="navigation" aria-label="Footer navigation">
          <Link
            href={`${process.env.NEXT_PUBLIC_APP_URL}/privacy`}
            style={linkStyles}
            className="footer-link"
          >
            {t.privacyPolicy}
          </Link>

          <Link
            href={`${process.env.NEXT_PUBLIC_APP_URL}/terms`}
            style={linkStyles}
            className="footer-link"
          >
            {t.termsOfService}
          </Link>

          <Link
            href={`${process.env.NEXT_PUBLIC_APP_URL}/help`}
            style={linkStyles}
            className="footer-link"
          >
            {t.helpCenter}
          </Link>

          <Link
            href={`${process.env.NEXT_PUBLIC_APP_URL}/contact`}
            style={linkStyles}
            className="footer-link"
          >
            {t.contactUs}
          </Link>
        </nav>
      </div>

      {/* Social Links */}
      {showSocialLinks && (
        <div style={{ marginBottom: tokens.spacing.lg }}>
          <Text style={footerTextStyles}>{t.followUs}</Text>
          <div>
            <Link
              href="https://linkedin.com/company/eleva-care"
              style={socialLinkStyles}
              className="social-link"
              aria-label={`${t.linkedin} (opens in new window)`}
            >
              {t.linkedin}
            </Link>

            <Link
              href="https://twitter.com/eleva_care"
              style={socialLinkStyles}
              className="social-link"
              aria-label={`${t.twitter} (opens in new window)`}
            >
              {t.twitter}
            </Link>

            <Link
              href="https://facebook.com/eleva.care"
              style={socialLinkStyles}
              className="social-link"
              aria-label={`${t.facebook} (opens in new window)`}
            >
              {t.facebook}
            </Link>
          </div>
        </div>
      )}

      {/* Unsubscribe and Preferences */}
      {unsubscribeUrl && (
        <div style={{ marginBottom: tokens.spacing.lg }}>
          <Text style={footerTextStyles}>
            <Link href={unsubscribeUrl} style={linkStyles} className="footer-link">
              {t.unsubscribe}
            </Link>
            {' | '}
            <Link
              href={`${process.env.NEXT_PUBLIC_APP_URL}/email-preferences`}
              style={linkStyles}
              className="footer-link"
            >
              {t.manageCommunications}
            </Link>
          </Text>
        </div>
      )}

      {/* Custom Footer Text */}
      {customFooterText && <Text style={footerTextStyles}>{customFooterText}</Text>}

      {/* Compliance Information */}
      <Text style={complianceStyles}>{t.gdprCompliance}</Text>

      <Text style={footerTextStyles}>{t.complianceText}</Text>

      {/* Copyright */}
      <Text style={copyrightStyles}>
        © {year} {companyName}. {t.allRightsReserved}
      </Text>

      {/* Accessibility and interaction styles */}
      <style>{`
        .footer-link:hover {
          color: ${tokens.colors.brand['health-secondary']};
          text-decoration: underline;
          transition: color 0.2s ease;
        }
        
        .footer-link:focus {
          outline: 2px solid ${tokens.colors.brand['health-primary']};
          outline-offset: 2px;
          border-radius: ${tokens.borderRadius.sm};
        }
        
        .social-link:hover {
          color: ${tokens.colors.brand['health-primary']};
          transition: color 0.2s ease;
        }
        
        .social-link:focus {
          outline: 2px solid ${tokens.colors.brand['health-primary']};
          outline-offset: 2px;
          border-radius: ${tokens.borderRadius.sm};
        }
        
        /* High contrast mode specific styles */
        .high-contrast .footer-link {
          color: ${tokens.colors.neutral[900]} !important;
          text-decoration: underline;
        }
        
        .high-contrast .footer-link:hover {
          background-color: ${tokens.colors.neutral[900]};
          color: #FFFFFF !important;
          padding: 2px 4px;
        }
        
        .high-contrast .social-link {
          color: ${tokens.colors.neutral[700]} !important;
          border: 1px solid ${tokens.colors.neutral[700]};
          padding: 2px 4px;
          margin: 2px;
        }
        
        /* Mobile responsive adjustments */
        @media screen and (max-width: 600px) {
          .email-footer {
            padding: ${tokens.spacing.md} !important;
          }
          
          .footer-link {
            display: block !important;
            margin: ${tokens.spacing.sm} 0 !important;
            text-align: center !important;
          }
          
          .social-link {
            display: inline-block !important;
            margin: ${tokens.spacing.xs} !important;
            text-align: center !important;
          }
        }
        
        /* Print styles */
        @media print {
          .social-link {
            display: none !important;
          }
        }
      `}</style>
    </Section>
  );
};

export default EmailFooter;
