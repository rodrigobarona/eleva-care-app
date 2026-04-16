import * as React from 'react';
import { EmailButton, EmailLayout } from '@/components/emails';
import {
  createTableCellStyle,
  ELEVA_CARD_STYLES,
  ELEVA_COLORS,
  ELEVA_TEXT_STYLES,
} from '@/emails/utils/brand-constants';
import type { SupportedLocale } from '@/emails/utils/i18n';
import { Heading, Hr, Section, Text } from '@react-email/components';

interface AppointmentCancelledEmailProps {
  recipientName?: string;
  recipientType?: 'patient' | 'expert';
  expertName?: string;
  clientName?: string;
  serviceName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  timezone?: string;
  refundAmountFormatted?: string;
  cancellationReason?: string;
  locale?: SupportedLocale;
}

const DIVIDER_STYLE = {
  borderColor: ELEVA_COLORS.neutral.light,
  borderTop: '1px solid',
  margin: '24px 0',
} as const;

/**
 * Email template sent when an expert cancels a confirmed appointment.
 * Sent to BOTH the patient (refund notice) and the expert (audit trail).
 */
export const AppointmentCancelledEmail = ({
  recipientName = 'João Silva',
  recipientType = 'patient',
  expertName = 'Dr. Maria Santos',
  clientName = 'João Silva',
  serviceName = 'Consulta de Cardiologia',
  appointmentDate = 'Monday, February 19, 2026',
  appointmentTime = '2:30 PM',
  timezone = 'Europe/Lisbon',
  refundAmountFormatted = '€7.00',
  cancellationReason,
  locale = 'en',
}: AppointmentCancelledEmailProps) => {
  const isPatient = recipientType === 'patient';

  const translations = {
    en: {
      patientSubject: `Your appointment was cancelled — refund on the way`,
      patientPreview: `Your appointment with ${expertName} has been cancelled and a refund of ${refundAmountFormatted} is being processed`,
      patientTitle: 'Appointment Cancelled',
      patientGreeting: `Hello ${recipientName},`,
      patientMessage: `Your appointment with ${expertName} has been cancelled. We're processing a full refund of ${refundAmountFormatted} to your original payment method.`,
      patientRefundExplanation:
        'Refunds typically arrive in 5-10 business days, depending on your bank or card issuer.',
      expertSubject: `You cancelled an appointment — confirmation`,
      expertPreview: `Confirmation: you cancelled the appointment with ${clientName}`,
      expertTitle: 'Cancellation Confirmed',
      expertGreeting: `Hello ${recipientName},`,
      expertMessage: `This is a confirmation that you cancelled the appointment with ${clientName}. The slot is now available for new bookings.`,
      expertRefundExplanation: `A full refund of ${refundAmountFormatted} has been initiated to the client. Their card or bank account will reflect the credit within a few business days.`,
      appointmentDetails: 'Appointment Details',
      service: 'Service',
      expert: 'Expert',
      client: 'Client',
      date: 'Date',
      time: 'Time',
      timezoneLabel: 'Timezone',
      refundLabel: 'Refund Amount',
      reasonLabel: 'Reason for cancellation',
      patientCta: 'Book Another Appointment',
      expertCta: 'View Schedule',
      needHelp: 'Need help?',
      supportText: "If you have any questions, please don't hesitate to contact our support team.",
    },
    pt: {
      patientSubject: `A sua consulta foi cancelada — reembolso a caminho`,
      patientPreview: `A sua consulta com ${expertName} foi cancelada e um reembolso de ${refundAmountFormatted} está em processamento`,
      patientTitle: 'Consulta Cancelada',
      patientGreeting: `Olá ${recipientName},`,
      patientMessage: `A sua consulta com ${expertName} foi cancelada. Estamos a processar um reembolso integral de ${refundAmountFormatted} para o método de pagamento original.`,
      patientRefundExplanation:
        'Os reembolsos costumam chegar em 5-10 dias úteis, dependendo do seu banco ou emissor de cartão.',
      expertSubject: `Cancelou uma consulta — confirmação`,
      expertPreview: `Confirmação: cancelou a consulta com ${clientName}`,
      expertTitle: 'Cancelamento Confirmado',
      expertGreeting: `Olá ${recipientName},`,
      expertMessage: `Esta é a confirmação de que cancelou a consulta com ${clientName}. O horário está agora disponível para novas marcações.`,
      expertRefundExplanation: `Foi iniciado um reembolso integral de ${refundAmountFormatted} para o cliente. O cartão ou conta bancária irá refletir o crédito dentro de alguns dias úteis.`,
      appointmentDetails: 'Detalhes da Consulta',
      service: 'Serviço',
      expert: 'Especialista',
      client: 'Cliente',
      date: 'Data',
      time: 'Hora',
      timezoneLabel: 'Fuso Horário',
      refundLabel: 'Valor do Reembolso',
      reasonLabel: 'Motivo do cancelamento',
      patientCta: 'Marcar Outra Consulta',
      expertCta: 'Ver Agenda',
      needHelp: 'Precisa de ajuda?',
      supportText: 'Se tiver alguma dúvida, não hesite em contactar a nossa equipa de suporte.',
    },
    es: {
      patientSubject: `Su cita ha sido cancelada — reembolso en camino`,
      patientPreview: `Su cita con ${expertName} ha sido cancelada y un reembolso de ${refundAmountFormatted} está siendo procesado`,
      patientTitle: 'Cita Cancelada',
      patientGreeting: `Hola ${recipientName},`,
      patientMessage: `Su cita con ${expertName} ha sido cancelada. Estamos procesando un reembolso completo de ${refundAmountFormatted} a su método de pago original.`,
      patientRefundExplanation:
        'Los reembolsos suelen llegar en 5-10 días hábiles, dependiendo de su banco o emisor de tarjeta.',
      expertSubject: `Canceló una cita — confirmación`,
      expertPreview: `Confirmación: canceló la cita con ${clientName}`,
      expertTitle: 'Cancelación Confirmada',
      expertGreeting: `Hola ${recipientName},`,
      expertMessage: `Esta es una confirmación de que canceló la cita con ${clientName}. El horario ahora está disponible para nuevas reservas.`,
      expertRefundExplanation: `Se ha iniciado un reembolso completo de ${refundAmountFormatted} al cliente. Su tarjeta o cuenta bancaria reflejará el crédito en unos días hábiles.`,
      appointmentDetails: 'Detalles de la Cita',
      service: 'Servicio',
      expert: 'Especialista',
      client: 'Cliente',
      date: 'Fecha',
      time: 'Hora',
      timezoneLabel: 'Zona horaria',
      refundLabel: 'Importe del reembolso',
      reasonLabel: 'Motivo de la cancelación',
      patientCta: 'Reservar Otra Cita',
      expertCta: 'Ver Agenda',
      needHelp: '¿Necesita ayuda?',
      supportText: 'Si tiene alguna pregunta, no dude en contactar con nuestro equipo de soporte.',
    },
  } as const;

  // Fall back to English for any unsupported locale (including pt-BR for now;
  // we can add a dedicated pt-BR variant later if needed).
  const t =
    (translations as unknown as Record<string, (typeof translations)['en']>)[locale as string] ??
    translations.en;

  const subject = isPatient ? t.patientSubject : t.expertSubject;
  const previewText = isPatient ? t.patientPreview : t.expertPreview;
  const title = isPatient ? t.patientTitle : t.expertTitle;
  const greeting = isPatient ? t.patientGreeting : t.expertGreeting;
  const message = isPatient ? t.patientMessage : t.expertMessage;
  const refundExplanation = isPatient ? t.patientRefundExplanation : t.expertRefundExplanation;
  const ctaLabel = isPatient ? t.patientCta : t.expertCta;
  const ctaUrl = isPatient ? 'https://eleva.care' : 'https://eleva.care/appointments';

  return (
    <EmailLayout
      subject={subject}
      previewText={previewText}
      headerVariant="branded"
      footerVariant="default"
      locale={locale}
    >
      {/* Banner */}
      <Section style={ELEVA_CARD_STYLES.warning}>
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading2,
            margin: '0 0 8px 0',
            textAlign: 'center' as const,
            color: ELEVA_COLORS.warning,
          }}
        >
          ❌ {title}
        </Heading>
      </Section>

      {/* Greeting */}
      <Section style={{ margin: '32px 0' }}>
        <Text style={{ ...ELEVA_TEXT_STYLES.bodyLarge, margin: '0 0 16px 0' }}>{greeting}</Text>
        <Text style={{ ...ELEVA_TEXT_STYLES.bodyRegular, margin: '0 0 16px 0' }}>{message}</Text>
        <Text
          style={{
            ...ELEVA_TEXT_STYLES.bodyRegular,
            margin: '0',
            color: ELEVA_COLORS.neutral.medium,
          }}
        >
          {refundExplanation}
        </Text>
      </Section>

      {/* Details */}
      <Section style={ELEVA_CARD_STYLES.default}>
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading3,
            margin: '0 0 24px 0',
            borderBottom: `2px solid ${ELEVA_COLORS.neutral.light}`,
            paddingBottom: '12px',
          }}
        >
          📅 {t.appointmentDetails}
        </Heading>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={createTableCellStyle(true)}>{t.service}:</td>
              <td style={createTableCellStyle(false, 'right')}>{serviceName}</td>
            </tr>
            <tr>
              <td style={createTableCellStyle(true)}>{isPatient ? t.expert : t.client}:</td>
              <td style={{ ...createTableCellStyle(false, 'right'), color: ELEVA_COLORS.primary }}>
                {isPatient ? expertName : clientName}
              </td>
            </tr>
            <tr>
              <td style={createTableCellStyle(true)}>{t.date}:</td>
              <td style={createTableCellStyle(false, 'right')}>{appointmentDate}</td>
            </tr>
            <tr>
              <td style={createTableCellStyle(true)}>{t.time}:</td>
              <td style={createTableCellStyle(false, 'right')}>
                {appointmentTime} ({timezone})
              </td>
            </tr>
            <tr>
              <td style={createTableCellStyle(true)}>{t.refundLabel}:</td>
              <td
                style={{
                  ...createTableCellStyle(false, 'right'),
                  color: ELEVA_COLORS.primary,
                  fontWeight: 600,
                }}
              >
                {refundAmountFormatted}
              </td>
            </tr>
            {cancellationReason ? (
              <tr>
                <td style={createTableCellStyle(true)}>{t.reasonLabel}:</td>
                <td style={createTableCellStyle(false, 'right')}>{cancellationReason}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Section>

      {/* CTA */}
      <Section style={{ margin: '32px 0', textAlign: 'center' as const }}>
        <EmailButton href={ctaUrl} variant="primary" size="lg">
          {ctaLabel}
        </EmailButton>
      </Section>

      <Hr style={DIVIDER_STYLE} />

      {/* Support */}
      <Section
        style={{
          textAlign: 'center' as const,
          padding: '20px',
          backgroundColor: ELEVA_COLORS.surface,
          borderRadius: '8px',
        }}
      >
        <Text style={{ ...ELEVA_TEXT_STYLES.bodyRegular, margin: '0' }}>
          <strong style={{ color: ELEVA_COLORS.primary }}>{t.needHelp}</strong>
          <br />
          {t.supportText}
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default AppointmentCancelledEmail;

AppointmentCancelledEmail.PreviewProps = {
  recipientName: 'João Silva',
  recipientType: 'patient',
  expertName: 'Dr. Maria Santos',
  clientName: 'João Silva',
  serviceName: 'Consulta de Cardiologia',
  appointmentDate: 'Monday, February 19, 2026',
  appointmentTime: '2:30 PM',
  timezone: 'Europe/Lisbon',
  refundAmountFormatted: '€7.00',
  cancellationReason: 'Expert needed to reschedule due to personal emergency',
  locale: 'en',
} as AppointmentCancelledEmailProps;
