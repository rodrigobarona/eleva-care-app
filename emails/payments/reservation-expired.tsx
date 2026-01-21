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

interface ReservationExpiredEmailProps {
  recipientName?: string;
  recipientType?: 'patient' | 'expert';
  expertName?: string;
  serviceName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  timezone?: string;
  locale?: string;
}

export const ReservationExpiredEmail = ({
  recipientName = 'João Silva',
  recipientType = 'patient',
  expertName = 'Dr. Maria Santos',
  serviceName = 'Consulta de Cardiologia',
  appointmentDate = 'Monday, February 19, 2024',
  appointmentTime = '2:30 PM',
  timezone = 'Europe/Lisbon',
  locale = 'en',
}: ReservationExpiredEmailProps) => {
  const isPatient = recipientType === 'patient';

  // Internationalization support
  const translations = {
    en: {
      // Patient-specific
      patientSubject: `Your booking reservation has expired - ${serviceName}`,
      patientPreview: `Your reservation for ${serviceName} with ${expertName} has expired due to unpaid payment`,
      patientTitle: 'Booking Reservation Expired',
      patientGreeting: `Hello ${recipientName},`,
      patientMessage: `We're writing to let you know that your booking reservation with <strong style="color: ${ELEVA_COLORS.primary}">${expertName}</strong> has expired because the payment was not completed within the required timeframe.`,
      patientExplanation:
        'Multibanco payments must be completed within 7 days of booking. Since the payment was not received, the time slot has been released and is now available to other clients.',
      // Expert-specific
      expertSubject: `Pending booking cancelled - Payment not received`,
      expertPreview: `A pending booking from ${recipientName} has been cancelled due to unpaid payment`,
      expertTitle: 'Pending Booking Cancelled',
      expertGreeting: `Hello ${recipientName},`,
      expertMessage: `A pending booking has been automatically cancelled because the client did not complete the Multibanco payment within the required 7-day period.`,
      expertExplanation:
        'The time slot has been automatically released and is now available for other bookings.',
      // Shared
      appointmentDetails: 'Appointment Details',
      service: 'Service',
      expert: 'Expert',
      client: 'Client',
      date: 'Date',
      time: 'Time',
      timezoneLabel: 'Timezone',
      whatNext: 'What happens next?',
      patientNextSteps:
        'If you still wish to book an appointment, you can do so through our platform. The same or different time slots may be available.',
      expertNextSteps:
        'No action is required from you. The slot is now free for other clients to book.',
      bookAgain: 'Book New Appointment',
      viewSchedule: 'View Schedule',
      needHelp: 'Need help?',
      supportText: "If you have any questions, please don't hesitate to contact our support team.",
    },
    pt: {
      // Patient-specific
      patientSubject: `A sua reserva expirou - ${serviceName}`,
      patientPreview: `A sua reserva para ${serviceName} com ${expertName} expirou por falta de pagamento`,
      patientTitle: 'Reserva de Marcação Expirada',
      patientGreeting: `Olá ${recipientName},`,
      patientMessage: `Escrevemos para informar que a sua reserva com <strong style="color: ${ELEVA_COLORS.primary}">${expertName}</strong> expirou porque o pagamento não foi concluído dentro do prazo necessário.`,
      patientExplanation:
        'Os pagamentos por Multibanco devem ser concluídos dentro de 7 dias após a marcação. Como o pagamento não foi recebido, o horário foi libertado e está agora disponível para outros clientes.',
      // Expert-specific
      expertSubject: `Marcação pendente cancelada - Pagamento não recebido`,
      expertPreview: `Uma marcação pendente de ${recipientName} foi cancelada por falta de pagamento`,
      expertTitle: 'Marcação Pendente Cancelada',
      expertGreeting: `Olá ${recipientName},`,
      expertMessage: `Uma marcação pendente foi automaticamente cancelada porque o cliente não completou o pagamento Multibanco dentro do período de 7 dias.`,
      expertExplanation:
        'O horário foi automaticamente libertado e está agora disponível para outras marcações.',
      // Shared
      appointmentDetails: 'Detalhes da Consulta',
      service: 'Serviço',
      expert: 'Especialista',
      client: 'Cliente',
      date: 'Data',
      time: 'Hora',
      timezoneLabel: 'Fuso Horário',
      whatNext: 'O que acontece a seguir?',
      patientNextSteps:
        'Se ainda deseja marcar uma consulta, pode fazê-lo através da nossa plataforma. Os mesmos ou diferentes horários podem estar disponíveis.',
      expertNextSteps:
        'Não é necessária nenhuma ação da sua parte. O horário está agora livre para outros clientes marcarem.',
      bookAgain: 'Marcar Nova Consulta',
      viewSchedule: 'Ver Agenda',
      needHelp: 'Precisa de ajuda?',
      supportText: 'Se tiver alguma dúvida, não hesite em contactar a nossa equipa de suporte.',
    },
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  const subject = isPatient ? t.patientSubject : t.expertSubject;
  const previewText = isPatient ? t.patientPreview : t.expertPreview;
  const title = isPatient ? t.patientTitle : t.expertTitle;
  const greeting = isPatient ? t.patientGreeting : t.expertGreeting;
  const message = isPatient ? t.patientMessage : t.expertMessage;
  const explanation = isPatient ? t.patientExplanation : t.expertExplanation;
  const nextSteps = isPatient ? t.patientNextSteps : t.expertNextSteps;
  const actionButton = isPatient ? t.bookAgain : t.viewSchedule;
  const actionUrl = isPatient ? 'https://eleva.care' : 'https://eleva.care/account/schedule';

  return (
    <EmailLayout
      subject={subject}
      previewText={previewText}
      headerVariant="branded"
      footerVariant="default"
      locale={locale as SupportedLocale}
    >
      {/* Warning Banner */}
      <Section style={ELEVA_CARD_STYLES.warning}>
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading2,
            margin: '0 0 8px 0',
            textAlign: 'center' as const,
            color: ELEVA_COLORS.warning,
          }}
        >
          ⏰ {title}
        </Heading>
      </Section>

      {/* Greeting and Message */}
      <Section style={{ margin: '32px 0' }}>
        <Text style={{ ...ELEVA_TEXT_STYLES.bodyLarge, margin: '0 0 16px 0' }}>{greeting}</Text>
        <Text
          style={{ ...ELEVA_TEXT_STYLES.bodyRegular, margin: '0 0 16px 0' }}
          dangerouslySetInnerHTML={{ __html: message }}
        />
        <Text
          style={{
            ...ELEVA_TEXT_STYLES.bodyRegular,
            margin: '0',
            color: ELEVA_COLORS.neutral.medium,
          }}
        >
          {explanation}
        </Text>
      </Section>

      {/* Appointment Details */}
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
                {isPatient ? expertName : recipientName}
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
          </tbody>
        </table>
      </Section>

      {/* What's Next */}
      <Section style={{ margin: '32px 0' }}>
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading3,
            margin: '0 0 16px 0',
            color: ELEVA_COLORS.primary,
          }}
        >
          📋 {t.whatNext}
        </Heading>
        <Text style={{ ...ELEVA_TEXT_STYLES.bodyRegular, margin: '0 0 24px 0' }}>{nextSteps}</Text>

        <Section style={{ textAlign: 'center' as const }}>
          <EmailButton href={actionUrl} variant="primary" size="lg">
            {actionButton}
          </EmailButton>
        </Section>
      </Section>

      <Hr style={ELEVA_TEXT_STYLES.divider} />

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

export default ReservationExpiredEmail;

// Sample data for React Email preview
ReservationExpiredEmail.PreviewProps = {
  recipientName: 'João Silva',
  recipientType: 'patient',
  expertName: 'Dr. Maria Santos',
  serviceName: 'Consulta de Cardiologia',
  appointmentDate: 'Monday, February 19, 2024',
  appointmentTime: '2:30 PM',
  timezone: 'Europe/Lisbon',
  locale: 'en',
} as ReservationExpiredEmailProps;
