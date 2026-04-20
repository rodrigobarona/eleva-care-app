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

interface MultibancoPaymentReminderProps {
  customerName?: string;
  expertName?: string;
  serviceName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  timezone?: string;
  /**
   * Appointment duration. Accepts either a number of minutes (e.g. `60`)
   * or a pre-formatted string (e.g. `"60 minutes"`) — the cron at
   * `app/api/cron/send-payment-reminders/route.ts` forwards
   * `event.durationInMinutes` (number) while the Stripe webhook forwards
   * `appointmentDetails.duration` (string). The conditional below treats
   * both as "present" when they carry a non-empty / positive value.
   */
  duration?: number | string;
  multibancoEntity?: string;
  multibancoReference?: string;
  multibancoAmount?: string;
  voucherExpiresAt?: string;
  hostedVoucherUrl?: string;
  customerNotes?: string;
  reminderType?: string;
  daysRemaining?: number;
  locale?: string;
}

// Neutral fallbacks — realistic samples live only in PreviewProps below.
// See plan: fix_fake_email_content_bug.
export default function MultibancoPaymentReminderTemplate({
  customerName = 'Customer',
  // `expertName` and `serviceName` intentionally have NO default: the
  // detail-table rows below render conditionally on these props being
  // truthy non-empty strings, so a non-empty default would defeat the
  // guard and render rows with placeholder text ("Your Expert" /
  // "Your appointment") even when the adapter omitted the fields.
  expertName,
  serviceName,
  appointmentDate = '',
  appointmentTime = '',
  timezone = '',
  duration,
  multibancoEntity = '',
  multibancoReference = '',
  multibancoAmount = '0.00',
  voucherExpiresAt = '',
  hostedVoucherUrl = '',
  customerNotes = '',
  reminderType = 'urgent',
  daysRemaining = 1,
  locale = 'en',
}: MultibancoPaymentReminderProps) {
  const isUrgent = reminderType === 'urgent' || daysRemaining <= 1;

  // Locale-aware fallbacks for subject / previewText interpolation when
  // the prop is missing — keeps the inbox preview readable while leaving
  // the conditional table rows below to omit themselves entirely.
  const expertLabel =
    typeof expertName === 'string' && expertName.trim().length > 0
      ? expertName
      : locale === 'pt'
        ? 'o seu especialista'
        : 'your expert';
  const serviceLabel =
    typeof serviceName === 'string' && serviceName.trim().length > 0
      ? serviceName
      : locale === 'pt'
        ? 'a sua consulta'
        : 'your appointment';

  // `duration` may arrive as either a number of minutes or a pre-formatted
  // string. Normalize to a render-ready label and a "should we show the
  // row?" flag so a value of `"60 minutes"` doesn't get hidden by a
  // numeric `> 0` check.
  const durationNumber =
    typeof duration === 'number'
      ? duration
      : typeof duration === 'string' && duration.trim().length > 0
        ? Number.parseInt(duration, 10)
        : Number.NaN;
  const hasDuration =
    (typeof duration === 'string' && duration.trim().length > 0) ||
    (Number.isFinite(durationNumber) && durationNumber > 0);
  const durationLabel =
    typeof duration === 'string' && duration.trim().length > 0
      ? duration
      : Number.isFinite(durationNumber) && durationNumber > 0
        ? `${durationNumber}`
        : '';

  // Internationalization support
  const translations = {
    en: {
      urgent: 'URGENT',
      subject: `Payment Reminder - Appointment with ${expertLabel}`,
      subjectUrgent: `URGENT: Payment Reminder - Appointment with ${expertLabel}`,
      previewText: `Your payment for the appointment with ${expertLabel} expires soon`,
      previewTextUrgent: `URGENT: Your payment for the appointment with ${expertLabel} expires soon`,
      title: `Payment Reminder - ${serviceLabel}`,
      greeting: 'Hello',
      reminderMessage: `This is a ${reminderType} reminder that your payment for the appointment with <strong>${expertLabel}</strong> is still pending and will expire soon.`,
      urgentWarning: `⚠️ Don't lose your appointment! Payment expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`,
      appointmentDetails: 'Appointment Details',
      paymentDetails: 'Multibanco Payment Details',
      service: 'Service',
      expert: 'Expert',
      date: 'Date',
      time: 'Time',
      duration: 'Duration',
      notes: 'Notes',
      entity: 'Entity',
      reference: 'Reference',
      amount: 'Amount',
      expires: 'Expires',
      actionRequired:
        "<strong>Action Required:</strong> Complete your payment now to secure your healthcare appointment. We're here to help if you need any assistance.",
      payNowUrgent: '🚨 PAY NOW - EXPIRES SOON!',
      completePayment: 'Complete Payment',
      warningTitle: "What happens if I don't pay in time?",
      warningText:
        'If payment is not received by the expiration date, your appointment will be automatically cancelled and the time slot will become available to other clients.',
      support: "Need help with payment? Contact our support team and we'll be happy to assist you.",
      minutes: 'minutes',
      paymentExpiring: 'Payment expiring soon - Secure your appointment now',
    },
    pt: {
      urgent: 'URGENTE',
      subject: `Lembrete de Pagamento - Consulta com ${expertLabel}`,
      subjectUrgent: `URGENTE: Lembrete de Pagamento - Consulta com ${expertLabel}`,
      previewText: `O seu pagamento para a consulta com ${expertLabel} expira em breve`,
      previewTextUrgent: `URGENTE: O seu pagamento para a consulta com ${expertLabel} expira em breve`,
      title: `Lembrete de Pagamento - ${serviceLabel}`,
      greeting: 'Olá',
      reminderMessage: `Este é um lembrete ${reminderType === 'urgent' ? 'urgente' : 'gentil'} de que o seu pagamento para a consulta com <strong>${expertLabel}</strong> ainda está pendente e expirará em breve.`,
      urgentWarning: `⚠️ Não perca a sua consulta! O pagamento expira em ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}.`,
      appointmentDetails: 'Detalhes da Consulta',
      paymentDetails: 'Detalhes do Pagamento Multibanco',
      service: 'Serviço',
      expert: 'Especialista',
      date: 'Data',
      time: 'Hora',
      duration: 'Duração',
      notes: 'Notas',
      entity: 'Entidade',
      reference: 'Referência',
      amount: 'Valor',
      expires: 'Expira',
      actionRequired:
        '<strong>Ação Necessária:</strong> Complete o seu pagamento agora para garantir a sua consulta. Estamos aqui para ajudar se precisar de assistência.',
      payNowUrgent: '🚨 PAGAR AGORA - EXPIRA EM BREVE!',
      completePayment: 'Completar Pagamento',
      warningTitle: 'O que acontece se não pagar a tempo?',
      warningText:
        'Se o pagamento não for recebido até à data de expiração, a sua consulta será automaticamente cancelada e o horário ficará disponível para outros clientes.',
      support:
        'Precisa de ajuda com o pagamento? Contacte a nossa equipa de apoio e ficaremos felizes em ajudá-lo.',
      minutes: 'minutos',
      paymentExpiring: 'Pagamento a expirar em breve - Garanta a sua consulta agora',
    },
  };

  // Get translations for the current locale, fallback to English
  const t = translations[locale as keyof typeof translations] || translations.en;

  const subject = isUrgent ? t.subjectUrgent : t.subject;
  const previewText = isUrgent ? t.previewTextUrgent : t.previewText;

  return (
    <EmailLayout
      subject={subject}
      previewText={previewText}
      headerVariant="branded"
      footerVariant="default"
      locale={locale as SupportedLocale}
    >
      {/* Premium Urgent Warning Banner */}
      {isUrgent && (
        <Section
          style={{
            backgroundColor: ELEVA_COLORS.errorLight,
            border: `3px solid ${ELEVA_COLORS.error}`,
            padding: '24px',
            borderRadius: '12px',
            margin: '0 0 24px 0',
            textAlign: 'center' as const,
          }}
        >
          <Text
            style={{
              ...ELEVA_TEXT_STYLES.bodyLarge,
              color: ELEVA_COLORS.error,
              fontWeight: ELEVA_TYPOGRAPHY.weights.bold,
              margin: '0',
            }}
          >
            {t.urgentWarning}
          </Text>
        </Section>
      )}

      {/* Premium Warning Banner - Payment Reminder */}
      <Section style={ELEVA_CARD_STYLES.warning}>
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading1,
            margin: '0 0 12px 0',
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
          {t.paymentExpiring}
        </Text>
      </Section>

      {/* Premium Personal Greeting */}
      <Section style={{ margin: '32px 0' }}>
        <Text style={{ ...ELEVA_TEXT_STYLES.bodyLarge, margin: '0 0 16px 0' }}>
          {t.greeting} {customerName},
        </Text>

        <Text
          style={ELEVA_TEXT_STYLES.bodyRegular}
          dangerouslySetInnerHTML={{ __html: t.reminderMessage }}
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
          {serviceName && serviceName.trim().length > 0 && (
            <tr>
              <td style={createTableCellStyle(true)}>{t.service}:</td>
              <td style={{ ...createTableCellStyle(false, 'right'), color: ELEVA_COLORS.primary }}>
                {serviceName}
              </td>
            </tr>
          )}
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
          {hasDuration && (
            <tr>
              <td style={createTableCellStyle(true)}>{t.duration}:</td>
              <td style={createTableCellStyle(false, 'right')}>
                {/* When the caller already supplied a string like "60 minutes"
                    we render it verbatim and skip the trailing minutes label
                    to avoid "60 minutes minutes". */}
                {typeof duration === 'string' ? durationLabel : `${durationLabel} ${t.minutes}`}
              </td>
            </tr>
          )}
          {expertName && expertName.trim().length > 0 && (
            <tr>
              <td style={createTableCellStyle(true)}>{t.expert}:</td>
              <td style={{ ...createTableCellStyle(false, 'right'), color: ELEVA_COLORS.primary }}>
                {expertName}
              </td>
            </tr>
          )}
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
          backgroundColor: isUrgent ? ELEVA_COLORS.errorLight : ELEVA_COLORS.warningLight,
          border: `2px solid ${isUrgent ? ELEVA_COLORS.error : ELEVA_COLORS.warning}`,
          padding: '28px',
          borderRadius: '12px',
          margin: '24px 0',
        }}
      >
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading3,
            margin: '0 0 24px 0',
            color: isUrgent ? ELEVA_COLORS.error : ELEVA_COLORS.warning,
            borderBottom: `2px solid ${isUrgent ? ELEVA_COLORS.error : ELEVA_COLORS.warning}`,
            paddingBottom: '12px',
          }}
        >
          💳 {t.paymentDetails}
        </Heading>

        <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
          {multibancoEntity && (
            <tr>
              <td
                style={{
                  ...createTableCellStyle(true),
                  color: isUrgent ? ELEVA_COLORS.error : ELEVA_COLORS.warning,
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
          )}
          {multibancoReference && (
            <tr>
              <td
                style={{
                  ...createTableCellStyle(true),
                  color: isUrgent ? ELEVA_COLORS.error : ELEVA_COLORS.warning,
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
          )}
          {multibancoAmount && multibancoAmount !== '0.00' && (
            <tr>
              <td
                style={{
                  ...createTableCellStyle(true),
                  color: isUrgent ? ELEVA_COLORS.error : ELEVA_COLORS.warning,
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
          )}
          {voucherExpiresAt && (
            <tr>
              <td
                style={{
                  ...createTableCellStyle(true),
                  color: isUrgent ? ELEVA_COLORS.error : ELEVA_COLORS.warning,
                  fontWeight: ELEVA_TYPOGRAPHY.weights.medium,
                }}
              >
                {t.expires}:
              </td>
              <td
                style={{
                  ...createTableCellStyle(false, 'right'),
                  fontWeight: ELEVA_TYPOGRAPHY.weights.bold,
                  color: isUrgent ? ELEVA_COLORS.error : ELEVA_COLORS.warning,
                  fontSize: '18px',
                }}
              >
                {voucherExpiresAt}
              </td>
            </tr>
          )}
        </table>

        <Text
          style={{
            ...ELEVA_TEXT_STYLES.bodySmall,
            color: isUrgent ? ELEVA_COLORS.error : ELEVA_COLORS.warning,
            margin: '20px 0 0 0',
            fontStyle: 'italic',
            padding: '16px',
            backgroundColor: ELEVA_COLORS.surface,
            borderRadius: '8px',
            border: `1px solid ${ELEVA_COLORS.neutral.border}`,
          }}
        >
          ⏰{' '}
          <strong style={{ color: isUrgent ? ELEVA_COLORS.error : ELEVA_COLORS.warning }}>
            {isUrgent ? 'URGENT:' : 'Important:'}
          </strong>{' '}
          Payment must be completed before the expiration date to secure your appointment.
        </Text>
      </Section>

      {/* Premium Action Required */}
      <Section style={{ margin: '32px 0' }}>
        <Text
          style={ELEVA_TEXT_STYLES.bodyRegular}
          dangerouslySetInnerHTML={{ __html: t.actionRequired }}
        />
      </Section>

      {/* Premium Action Button — only render when we have a real voucher URL.
          An empty href would otherwise reload the email view in some clients. */}
      {hostedVoucherUrl && (
        <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
          <EmailButton
            href={hostedVoucherUrl}
            style={{
              ...ELEVA_BUTTON_STYLES.primary,
              backgroundColor: isUrgent ? ELEVA_COLORS.error : ELEVA_COLORS.warning,
              borderColor: isUrgent ? ELEVA_COLORS.error : ELEVA_COLORS.warning,
              fontSize: isUrgent ? '20px' : '18px',
              padding: isUrgent ? '24px 48px' : '20px 40px',
              animation: isUrgent ? 'pulse 2s infinite' : 'none',
            }}
          >
            {isUrgent ? t.payNowUrgent : t.completePayment}
          </EmailButton>
        </Section>
      )}

      {/* Premium Warning Section */}
      <Section style={ELEVA_CARD_STYLES.warning}>
        <Text
          style={{
            ...ELEVA_TEXT_STYLES.bodySmall,
            color: ELEVA_COLORS.warning,
            margin: '0',
          }}
        >
          <strong style={{ color: ELEVA_COLORS.warning }}>{t.warningTitle}</strong>
          <br />
          {t.warningText}
        </Text>
      </Section>

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
MultibancoPaymentReminderTemplate.PreviewProps = {
  customerName: 'João Silva',
  expertName: 'Dr. Maria Santos',
  serviceName: 'Consulta de Cardiologia',
  appointmentDate: '2024-02-19',
  appointmentTime: '14:30',
  timezone: 'Europe/Lisbon',
  duration: 60,
  multibancoEntity: '12345',
  multibancoReference: '987654321',
  multibancoAmount: '75.00',
  voucherExpiresAt: '2024-02-20',
  hostedVoucherUrl: 'https://eleva.care/payment/voucher/123',
  customerNotes: 'First consultation - health check',
  reminderType: 'urgent',
  daysRemaining: 1,
  locale: 'en',
} as MultibancoPaymentReminderProps;
