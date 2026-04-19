import * as React from 'react';
import { EmailButton, EmailLayout } from '@/components/emails';
import {
  createTableCellStyle,
  ELEVA_BUTTON_STYLES,
  ELEVA_CARD_STYLES,
  ELEVA_COLORS,
  ELEVA_TEXT_STYLES,
  ELEVA_TYPOGRAPHY,
} from '@/emails/utils/brand-constants';
import type { SupportedLocale } from '@/emails/utils/i18n';
import { Heading, Hr, Section, Text } from '@react-email/components';

interface MultibancoBookingPendingProps {
  customerName?: string;
  expertName?: string;
  serviceName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  timezone?: string;
  duration?: number;
  multibancoEntity?: string;
  multibancoReference?: string;
  multibancoAmount?: string;
  voucherExpiresAt?: string;
  hostedVoucherUrl?: string;
  customerNotes?: string;
  locale?: string;
}

/**
 * Email sent to a patient immediately after they choose Multibanco at
 * checkout. Renders the appointment summary plus the entity/reference/amount
 * needed to pay the voucher and a CTA linking to the hosted voucher page.
 *
 * The action button is only rendered when `hostedVoucherUrl` is non-empty so
 * an empty href cannot reload the email view in some clients.
 *
 * Realistic sample values live only in `PreviewProps` so React Email's dev
 * preview is rich while production rendering can never inherit them.
 *
 * @example
 * ```tsx
 * <MultibancoBookingPendingTemplate
 *   customerName="Matilde Henriques"
 *   expertName="Patricia Mota"
 *   serviceName="Physiotherapy session"
 *   appointmentDate="Tuesday, April 22, 2026"
 *   appointmentTime="2:00 PM"
 *   timezone="Europe/Lisbon"
 *   duration={45}
 *   multibancoEntity="11249"
 *   multibancoReference="500300600"
 *   multibancoAmount="70.00"
 *   voucherExpiresAt="Friday, April 25, 2026"
 *   hostedVoucherUrl="https://stripe.com/voucher/real"
 *   locale="en"
 * />
 * ```
 */
export default function MultibancoBookingPendingTemplate({
  customerName = 'Customer',
  expertName = 'Your Expert',
  serviceName = 'Your appointment',
  appointmentDate = '',
  appointmentTime = '',
  timezone = '',
  duration = 0,
  multibancoEntity = '',
  multibancoReference = '',
  multibancoAmount = '0.00',
  voucherExpiresAt = '',
  hostedVoucherUrl = '',
  customerNotes,
  locale = 'en',
}: MultibancoBookingPendingProps) {
  // Internationalization support
  const translations = {
    en: {
      subject: `Appointment with ${expertName} - Payment Pending via Multibanco`,
      previewText: `Complete your booking with ${expertName} by paying via Multibanco`,
      title: 'Payment Pending - Complete Your Booking',
      greeting: 'Hello',
      mainMessage: `We've reserved your appointment with <strong>${expertName}</strong> and are waiting for your payment confirmation via Multibanco.`,
      appointmentDetails: 'Appointment Details',
      paymentDetails: 'Multibanco Payment Details',
      service: 'Service',
      date: 'Date',
      time: 'Time',
      duration: 'Duration',
      notes: 'Notes',
      entity: 'Entity',
      reference: 'Reference',
      amount: 'Amount',
      expires: 'Expires',
      instructions:
        'To complete your booking, please pay via Multibanco using the details above or visit your payment voucher:',
      viewVoucher: 'View Payment Voucher',
      support: `If you have any questions or need assistance, please don't hesitate to contact our support team.`,
      minutes: 'minutes',
      paymentUrgent: 'Payment required to secure your appointment',
    },
    pt: {
      subject: `Consulta com ${expertName} - Pagamento Pendente via Multibanco`,
      previewText: `Complete a sua marcação com ${expertName} pagando via Multibanco`,
      title: 'Pagamento Pendente - Complete a Sua Marcação',
      greeting: 'Olá',
      mainMessage: `Reservámos a sua consulta com <strong>${expertName}</strong> e aguardamos a confirmação do pagamento via Multibanco.`,
      appointmentDetails: 'Detalhes da Consulta',
      paymentDetails: 'Detalhes do Pagamento Multibanco',
      service: 'Serviço',
      date: 'Data',
      time: 'Hora',
      duration: 'Duração',
      notes: 'Notas',
      entity: 'Entidade',
      reference: 'Referência',
      amount: 'Valor',
      expires: 'Expira',
      instructions:
        'Para completar a sua marcação, pague via Multibanco usando os detalhes acima ou visite o seu voucher de pagamento:',
      viewVoucher: 'Ver Voucher de Pagamento',
      support:
        'Se tiver alguma dúvida ou precisar de ajuda, não hesite em contactar a nossa equipa de apoio.',
      minutes: 'minutos',
      paymentUrgent: 'Pagamento necessário para garantir a sua consulta',
    },
  };

  // Get translations for the current locale, fallback to English
  const t = translations[locale as keyof typeof translations] || translations.en;

  const subject = t.subject;
  const previewText = t.previewText;

  return (
    <EmailLayout
      subject={subject}
      previewText={previewText}
      headerVariant="branded"
      footerVariant="default"
      locale={locale as SupportedLocale}
    >
      {/* Premium Warning Banner - Payment Required */}
      <Section style={ELEVA_CARD_STYLES.warning}>
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading2,
            margin: '0 0 8px 0',
            textAlign: 'center' as const,
            color: ELEVA_COLORS.warning,
          }}
        >
          💳 {t.title}
        </Heading>
        <Text
          style={{
            ...ELEVA_TEXT_STYLES.bodyRegular,
            margin: '0',
            textAlign: 'center' as const,
            fontWeight: ELEVA_TYPOGRAPHY.weights.medium,
            color: ELEVA_COLORS.warning,
          }}
        >
          {t.paymentUrgent}
        </Text>
      </Section>

      {/* Premium Personal Greeting */}
      <Section style={{ margin: '32px 0' }}>
        <Text style={{ ...ELEVA_TEXT_STYLES.bodyLarge, margin: '0 0 16px 0' }}>
          {t.greeting} {customerName},
        </Text>

        <Text
          style={ELEVA_TEXT_STYLES.bodyRegular}
          dangerouslySetInnerHTML={{ __html: t.mainMessage }}
        />
      </Section>

      {/* Premium Appointment Details - Eleva Branded */}
      <Section style={ELEVA_CARD_STYLES.branded}>
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading3,
            margin: '0 0 24px 0',
            borderBottom: `2px solid ${ELEVA_COLORS.primary}`,
            paddingBottom: '12px',
          }}
        >
          📅 {t.appointmentDetails}
        </Heading>

        <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
          <tr>
            <td style={createTableCellStyle(true)}>{t.service}:</td>
            <td style={{ ...createTableCellStyle(false, 'right'), color: ELEVA_COLORS.primary }}>
              {serviceName}
            </td>
          </tr>
          {appointmentDate && (
            <tr>
              <td style={createTableCellStyle(true)}>{t.date}:</td>
              <td style={createTableCellStyle(false, 'right')}>{appointmentDate}</td>
            </tr>
          )}
          {appointmentTime && (
            <tr>
              <td style={createTableCellStyle(true)}>{t.time}:</td>
              <td style={createTableCellStyle(false, 'right')}>
                {appointmentTime}
                {timezone && ` (${timezone})`}
              </td>
            </tr>
          )}
          {duration > 0 && (
            <tr>
              <td style={createTableCellStyle(true)}>{t.duration}:</td>
              <td style={createTableCellStyle(false, 'right')}>
                {duration} {t.minutes}
              </td>
            </tr>
          )}
          <tr>
            <td style={createTableCellStyle(true)}>Expert:</td>
            <td style={{ ...createTableCellStyle(false, 'right'), color: ELEVA_COLORS.primary }}>
              {expertName}
            </td>
          </tr>
          {customerNotes && (
            <tr>
              <td style={createTableCellStyle(true)}>{t.notes}:</td>
              <td style={createTableCellStyle(false, 'right')}>{customerNotes}</td>
            </tr>
          )}
        </table>
      </Section>

      {/* Premium Multibanco Payment Details */}
      <Section
        style={{
          backgroundColor: ELEVA_COLORS.errorLight,
          border: `2px solid ${ELEVA_COLORS.error}`,
          padding: '28px',
          borderRadius: '12px',
          margin: '24px 0',
        }}
      >
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading3,
            margin: '0 0 24px 0',
            color: ELEVA_COLORS.error,
            borderBottom: `2px solid ${ELEVA_COLORS.error}`,
            paddingBottom: '12px',
          }}
        >
          💳 {t.paymentDetails}
        </Heading>

        <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
          <tr>
            <td
              style={{
                ...createTableCellStyle(true),
                color: ELEVA_COLORS.error,
                fontWeight: ELEVA_TYPOGRAPHY.weights.medium,
              }}
            >
              {t.entity}:
            </td>
            <td
              style={{
                ...createTableCellStyle(false, 'right'),
                fontFamily: 'monospace',
                fontSize: '18px',
                fontWeight: ELEVA_TYPOGRAPHY.weights.bold,
              }}
            >
              {multibancoEntity}
            </td>
          </tr>
          <tr>
            <td
              style={{
                ...createTableCellStyle(true),
                color: ELEVA_COLORS.error,
                fontWeight: ELEVA_TYPOGRAPHY.weights.medium,
              }}
            >
              {t.reference}:
            </td>
            <td
              style={{
                ...createTableCellStyle(false, 'right'),
                fontFamily: 'monospace',
                fontSize: '18px',
                fontWeight: ELEVA_TYPOGRAPHY.weights.bold,
              }}
            >
              {multibancoReference}
            </td>
          </tr>
          <tr>
            <td
              style={{
                ...createTableCellStyle(true),
                color: ELEVA_COLORS.error,
                fontWeight: ELEVA_TYPOGRAPHY.weights.medium,
              }}
            >
              {t.amount}:
            </td>
            <td
              style={{
                ...createTableCellStyle(false, 'right'),
                fontSize: '20px',
                fontWeight: ELEVA_TYPOGRAPHY.weights.bold,
                color: ELEVA_COLORS.success,
              }}
            >
              €{multibancoAmount}
            </td>
          </tr>
          <tr>
            <td
              style={{
                ...createTableCellStyle(true),
                color: ELEVA_COLORS.error,
                fontWeight: ELEVA_TYPOGRAPHY.weights.medium,
              }}
            >
              {t.expires}:
            </td>
            <td
              style={{
                ...createTableCellStyle(false, 'right'),
                fontWeight: ELEVA_TYPOGRAPHY.weights.bold,
                color: ELEVA_COLORS.error,
              }}
            >
              {voucherExpiresAt}
            </td>
          </tr>
        </table>

        <Text
          style={{
            ...ELEVA_TEXT_STYLES.bodySmall,
            color: ELEVA_COLORS.error,
            margin: '20px 0 0 0',
            fontStyle: 'italic',
            padding: '16px',
            backgroundColor: ELEVA_COLORS.surface,
            borderRadius: '8px',
            border: `1px solid ${ELEVA_COLORS.neutral.border}`,
          }}
        >
          ⏰ <strong style={{ color: ELEVA_COLORS.error }}>Important:</strong> Payment must be
          completed before the expiration date to secure your appointment.
        </Text>
      </Section>

      {/* Premium Instructions */}
      <Section style={{ margin: '32px 0' }}>
        <Text style={ELEVA_TEXT_STYLES.bodyRegular}>{t.instructions}</Text>
      </Section>

      {/* Premium Action Button — only render when we have a real voucher URL. */}
      {hostedVoucherUrl && (
        <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
          <EmailButton
            href={hostedVoucherUrl}
            style={{
              ...ELEVA_BUTTON_STYLES.primary,
              backgroundColor: ELEVA_COLORS.warning,
              borderColor: ELEVA_COLORS.warning,
              fontSize: '18px',
              padding: '20px 40px',
            }}
          >
            {t.viewVoucher}
          </EmailButton>
        </Section>
      )}

      <Hr style={{ margin: '40px 0', borderColor: ELEVA_COLORS.neutral.border }} />

      {/* Premium Support Information */}
      <Section
        style={{
          ...ELEVA_CARD_STYLES.default,
          textAlign: 'center' as const,
        }}
      >
        <Text
          style={{
            ...ELEVA_TEXT_STYLES.bodySmall,
            margin: '0',
          }}
        >
          {t.support}
        </Text>
      </Section>
    </EmailLayout>
  );
}

// Sample data for React Email preview only — never used in production rendering.
MultibancoBookingPendingTemplate.PreviewProps = {
  customerName: 'João Silva',
  expertName: 'Dr. Maria Santos',
  serviceName: 'Consulta de Cardiologia',
  appointmentDate: '2024-02-15',
  appointmentTime: '10:00',
  timezone: 'Europe/Lisbon',
  duration: 60,
  multibancoEntity: '12345',
  multibancoReference: '987654321',
  multibancoAmount: '75.00',
  voucherExpiresAt: '2024-02-12',
  hostedVoucherUrl: 'https://eleva.care/payment/voucher/123',
  customerNotes: 'First consultation - health check',
  locale: 'en',
} as MultibancoBookingPendingProps;
