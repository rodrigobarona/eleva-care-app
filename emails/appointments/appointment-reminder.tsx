import * as React from 'react';
import { EmailButton, EmailLayout } from '@/components/emails';
import {
  createTableCellStyle,
  ELEVA_CARD_STYLES,
  ELEVA_COLORS,
  ELEVA_TEXT_STYLES,
  ELEVA_TYPOGRAPHY,
} from '@/emails/utils/brand-constants';
import type { SupportedLocale } from '@/emails/utils/i18n';
import { Heading, Hr, Section, Text } from '@react-email/components';

interface AppointmentReminderEmailProps {
  patientName?: string;
  expertName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  timezone?: string;
  duration?: number;
  appointmentType?: string;
  meetingLink?: string;
  locale?: string;
}

/**
 * Reminder email sent to a patient ahead of an upcoming appointment.
 * Renders appointment details and a "Join Video Call" button when a meeting
 * link is available. Conditional rows ensure no labels appear without values.
 *
 * Realistic sample values live only in `PreviewProps` so React Email's dev
 * preview is rich while production rendering can never inherit them.
 *
 * @example
 * ```tsx
 * <AppointmentReminderEmail
 *   patientName="Matilde Henriques"
 *   expertName="Patricia Mota"
 *   appointmentType="Physiotherapy session"
 *   appointmentDate="Monday, April 20, 2026"
 *   appointmentTime="12:00 PM"
 *   timezone="Europe/Lisbon"
 *   duration={60}
 *   meetingLink="https://meet.google.com/abc-defg-hij"
 *   locale="en"
 * />
 * ```
 */
export const AppointmentReminderEmail = ({
  patientName = 'Customer',
  expertName = 'Your Expert',
  appointmentDate = '',
  appointmentTime = '',
  timezone = '',
  duration = 0,
  appointmentType = 'Your appointment',
  meetingLink,
  locale = 'en',
}: AppointmentReminderEmailProps) => {
  // Internationalization support
  const translations = {
    en: {
      subject: `Reminder: Your appointment with ${expertName} is tomorrow`,
      previewText: `Reminder: Your appointment with ${expertName} is tomorrow - ${appointmentType}`,
      title: 'Appointment Reminder',
      greeting: `Hello ${patientName}, this is a friendly reminder about your upcoming appointment.`,
      yourExpert: 'Your Expert',
      date: 'Date',
      time: 'Time',
      duration: 'Duration',
      minutes: 'minutes',
      timezoneLabel: 'Timezone',
      joinVideoCall: 'Join Video Call',
      howToPrepare: 'How to prepare',
      prepareItem1: 'Have your medical history and current medications ready',
      prepareItem2: "Prepare any questions you'd like to discuss",
      prepareItem3: 'Ensure you have a stable internet connection for video calls',
      prepareItem4: 'Join the meeting 5 minutes early',
      needAssistance: 'Need assistance?',
      supportText: 'If you have any questions or need support, please contact our team.',
      footerText:
        'If you have any questions or need to make changes to your appointment, please contact our support team.',
    },
    pt: {
      subject: `Lembrete: A sua consulta com ${expertName} é amanhã`,
      previewText: `Lembrete: A sua consulta com ${expertName} é amanhã - ${appointmentType}`,
      title: 'Lembrete de Consulta',
      greeting: `Olá ${patientName}, este é um lembrete amigável sobre a sua próxima consulta.`,
      yourExpert: 'O Seu Especialista',
      date: 'Data',
      time: 'Hora',
      duration: 'Duração',
      minutes: 'minutos',
      timezoneLabel: 'Fuso Horário',
      joinVideoCall: 'Entrar na Videochamada',
      howToPrepare: 'Como se preparar',
      prepareItem1: 'Tenha o seu histórico médico e medicamentos atuais prontos',
      prepareItem2: 'Prepare as perguntas que gostaria de discutir',
      prepareItem3: 'Garanta que tem uma conexão de internet estável para videochamadas',
      prepareItem4: 'Entre na reunião 5 minutos antes',
      needAssistance: 'Precisa de ajuda?',
      supportText: 'Se tiver alguma dúvida ou precisar de suporte, contacte a nossa equipa.',
      footerText:
        'Se tiver alguma dúvida ou precisar de alterar a sua consulta, contacte a nossa equipa de suporte.',
    },
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  return (
    <EmailLayout
      subject={t.subject}
      previewText={t.previewText}
      headerVariant="branded"
      footerVariant="default"
      locale={locale as SupportedLocale}
    >
      {/* Premium Header Banner */}
      <Section style={ELEVA_CARD_STYLES.branded}>
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading1,
            margin: '0 0 8px 0',
            textAlign: 'center' as const,
          }}
        >
          📅 {t.title}
        </Heading>
        <Text
          style={{
            ...ELEVA_TEXT_STYLES.bodyRegular,
            margin: '0',
            textAlign: 'center' as const,
            fontWeight: ELEVA_TYPOGRAPHY.weights.medium,
          }}
        >
          {appointmentType}
        </Text>
      </Section>

      {/* Greeting */}
      <Section style={{ margin: '32px 0' }}>
        <Text style={{ ...ELEVA_TEXT_STYLES.bodyLarge, margin: '0 0 16px 0' }}>{t.greeting}</Text>
      </Section>

      {/* Appointment Details */}
      <Section style={ELEVA_CARD_STYLES.success}>
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading3,
            margin: '0 0 24px 0',
            borderBottom: `2px solid ${ELEVA_COLORS.primary}`,
            paddingBottom: '12px',
          }}
        >
          {appointmentType}
        </Heading>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={createTableCellStyle(true)}>{t.yourExpert}:</td>
              <td style={{ ...createTableCellStyle(false, 'right'), color: ELEVA_COLORS.primary }}>
                {expertName}
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
                <td style={createTableCellStyle(false, 'right')}>{appointmentTime}</td>
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
            {timezone && (
              <tr>
                <td style={createTableCellStyle(true)}>{t.timezoneLabel}:</td>
                <td style={createTableCellStyle(false, 'right')}>{timezone}</td>
              </tr>
            )}
          </tbody>
        </table>

        {meetingLink && (
          <Section style={{ textAlign: 'center', marginTop: '24px' }}>
            <EmailButton href={meetingLink} variant="primary" size="lg">
              🎥 {t.joinVideoCall}
            </EmailButton>
          </Section>
        )}
      </Section>

      {/* How to Prepare */}
      <Section style={ELEVA_CARD_STYLES.default}>
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading3,
            margin: '0 0 20px 0',
            color: ELEVA_COLORS.primary,
          }}
        >
          📋 {t.howToPrepare}
        </Heading>
        <Text style={ELEVA_TEXT_STYLES.listItem}>
          • <strong style={{ color: ELEVA_COLORS.primary }}>{t.prepareItem1}</strong>
        </Text>
        <Text style={ELEVA_TEXT_STYLES.listItem}>
          • <strong style={{ color: ELEVA_COLORS.primary }}>{t.prepareItem2}</strong>
        </Text>
        <Text style={ELEVA_TEXT_STYLES.listItem}>
          • <strong style={{ color: ELEVA_COLORS.primary }}>{t.prepareItem3}</strong>
        </Text>
        <Text style={ELEVA_TEXT_STYLES.listItem}>
          • <strong style={{ color: ELEVA_COLORS.primary }}>{t.prepareItem4}</strong>
        </Text>
      </Section>

      {/* Need Assistance */}
      <Section
        style={{
          textAlign: 'center' as const,
          margin: '32px 0',
          padding: '20px',
          backgroundColor: ELEVA_COLORS.surface,
          borderRadius: '8px',
        }}
      >
        <Text
          style={{
            ...ELEVA_TEXT_STYLES.bodyRegular,
            margin: '0',
          }}
        >
          <strong style={{ color: ELEVA_COLORS.primary }}>{t.needAssistance}</strong>
          <br />
          {t.supportText}
        </Text>
      </Section>

      <Hr style={ELEVA_TEXT_STYLES.divider} />

      <Text
        style={{
          ...ELEVA_TEXT_STYLES.bodySmall,
          textAlign: 'center' as const,
          color: ELEVA_COLORS.neutral.medium,
        }}
      >
        {t.footerText}
      </Text>
    </EmailLayout>
  );
};

export default AppointmentReminderEmail;

// Sample data for React Email preview
AppointmentReminderEmail.PreviewProps = {
  patientName: 'João Silva',
  expertName: 'Dr. Maria Santos',
  appointmentDate: 'Monday, February 19, 2024',
  appointmentTime: '2:30 PM - 3:30 PM',
  timezone: 'Europe/Lisbon',
  duration: 60,
  appointmentType: 'Consulta de Cardiologia',
  meetingLink: 'https://meet.google.com/abc-defg-hij',
  locale: 'en',
} as AppointmentReminderEmailProps;
