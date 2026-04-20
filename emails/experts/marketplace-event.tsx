import * as React from 'react';
import { EmailLayout } from '@/components/emails';
import {
  ELEVA_CARD_STYLES,
  ELEVA_COLORS,
  ELEVA_TEXT_STYLES,
  ELEVA_TYPOGRAPHY,
} from '@/emails/utils/brand-constants';
import type { SupportedLocale } from '@/emails/utils/i18n';
import { Heading, Section, Text } from '@react-email/components';

/**
 * Locales the marketplace event template ships translations for. The
 * union mirrors the global `SupportedLocale` so callers can't pass a
 * value the template doesn't actually translate.
 */
export type MarketplaceEventLocale = 'en' | 'pt' | 'es' | 'br';

/**
 * `marketplace-universal` workflow event types we know about. Used to
 * drive the headline / icon — the body itself is taken verbatim from
 * the `message` payload field.
 */
export type MarketplaceEventType =
  | 'payment-received'
  | 'payout-processed'
  | 'connect-account-status'
  | 'refund-processed';

interface MarketplaceEventEmailProps {
  expertName?: string;
  /**
   * Localized message to render in the body card. Comes straight from
   * the workflow trigger (e.g. `"You received a payment of EUR 70.00..."`).
   * Rendered verbatim — callers are responsible for localization.
   */
  message?: string;
  amount?: string;
  currency?: string;
  accountStatus?: string;
  eventType?: MarketplaceEventType;
  /** Optional CTA button. Hidden when both `actionUrl` and `actionText` are absent. */
  actionUrl?: string;
  actionText?: string;
  locale?: MarketplaceEventLocale;
}

const ICONS: Record<MarketplaceEventType, string> = {
  'payment-received': '💰',
  'payout-processed': '🏦',
  'connect-account-status': '🔧',
  'refund-processed': '↩️',
};

const HEADINGS: Record<MarketplaceEventLocale, Record<MarketplaceEventType, string>> = {
  en: {
    'payment-received': 'Payment received',
    'payout-processed': 'Payout processed',
    'connect-account-status': 'Account update',
    'refund-processed': 'Refund processed',
  },
  pt: {
    'payment-received': 'Pagamento recebido',
    'payout-processed': 'Transferência processada',
    'connect-account-status': 'Atualização de conta',
    'refund-processed': 'Reembolso processado',
  },
  br: {
    'payment-received': 'Pagamento recebido',
    'payout-processed': 'Repasse processado',
    'connect-account-status': 'Atualização de conta',
    'refund-processed': 'Reembolso processado',
  },
  es: {
    'payment-received': 'Pago recibido',
    'payout-processed': 'Pago procesado',
    'connect-account-status': 'Actualización de cuenta',
    'refund-processed': 'Reembolso procesado',
  },
};

/**
 * Branded React Email template for the `marketplace-universal` Novu
 * workflow. Replaces the inline HTML body that previously shipped from
 * `config/novu.ts` (no branding, no localization, no CTA). Used for
 * expert-side notifications about marketplace events: payment received,
 * payout processed, Connect account status changes, and refund
 * processed (from `notifyAppointmentConflict`).
 */
export const MarketplaceEventEmail = ({
  expertName = 'Expert',
  message = '',
  amount,
  currency = 'EUR',
  accountStatus,
  eventType = 'payment-received',
  actionUrl,
  actionText,
  locale = 'en',
}: MarketplaceEventEmailProps) => {
  const heading = HEADINGS[locale][eventType];
  const icon = ICONS[eventType];
  const subject = `${icon} ${heading} - Eleva Care`;
  const trimmedMessage = (message || '').trim();
  const previewText = trimmedMessage.length
    ? `${heading}: ${trimmedMessage.length > 100 ? `${trimmedMessage.substring(0, 100)}...` : trimmedMessage}`
    : heading;

  const greeting =
    locale === 'pt' || locale === 'br'
      ? `Olá ${expertName},`
      : locale === 'es'
        ? `Hola ${expertName},`
        : `Hello ${expertName},`;

  return (
    <EmailLayout
      subject={subject}
      previewText={previewText}
      headerVariant="branded"
      footerVariant="default"
      locale={locale satisfies SupportedLocale}
    >
      <Section style={ELEVA_CARD_STYLES.success}>
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading2,
            margin: '0 0 8px 0',
            textAlign: 'center' as const,
          }}
        >
          {icon} {heading}
        </Heading>
        {amount && (
          <Text
            style={{
              ...ELEVA_TEXT_STYLES.bodyLarge,
              margin: '0',
              textAlign: 'center' as const,
              fontWeight: ELEVA_TYPOGRAPHY.weights.bold,
              color: ELEVA_COLORS.primary,
            }}
          >
            {currency} {amount}
          </Text>
        )}
      </Section>

      <Section style={{ margin: '32px 0' }}>
        <Text style={{ ...ELEVA_TEXT_STYLES.bodyLarge, margin: '0 0 16px 0' }}>{greeting}</Text>
        {trimmedMessage && (
          <Text style={ELEVA_TEXT_STYLES.bodyRegular}>{trimmedMessage}</Text>
        )}
        {accountStatus && (
          <Text
            style={{
              ...ELEVA_TEXT_STYLES.bodyRegular,
              marginTop: '16px',
              color: ELEVA_COLORS.neutral.dark,
            }}
          >
            <strong>Status:</strong> {accountStatus}
          </Text>
        )}
      </Section>

      {actionUrl && actionText && (
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <a
            href={actionUrl}
            style={{
              display: 'inline-block',
              backgroundColor: ELEVA_COLORS.primary,
              color: ELEVA_COLORS.surface,
              padding: '14px 28px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: ELEVA_TYPOGRAPHY.weights.medium,
            }}
          >
            {actionText}
          </a>
        </Section>
      )}
    </EmailLayout>
  );
};

export default MarketplaceEventEmail;

MarketplaceEventEmail.PreviewProps = {
  expertName: 'Dr. Patricia Mota',
  message: 'You received a payment of EUR 70.00 for a session with Marta Carvalho.',
  amount: '70.00',
  currency: 'EUR',
  eventType: 'payment-received',
  actionUrl: 'https://eleva.care/dashboard/earnings',
  actionText: 'View earnings',
  locale: 'en',
} as MarketplaceEventEmailProps;
