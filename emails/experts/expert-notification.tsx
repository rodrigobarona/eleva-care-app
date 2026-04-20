import * as React from 'react';
import { EmailButton, EmailLayout } from '@/components/emails';
import type { SupportedLocale } from '@/emails/utils/i18n';
import { Heading, Hr, Section, Text } from '@react-email/components';

interface ExpertNotificationEmailProps {
  expertName?: string;
  notificationTitle?: string;
  notificationMessage?: string;
  actionUrl?: string;
  actionText?: string;
  /**
   * Locale used by the surrounding `EmailLayout` (header / footer copy is
   * localized there). The body of this template is generic — title and
   * message strings come straight from the caller, so they should already
   * be in the recipient's language at the point of trigger.
   */
  locale?: SupportedLocale;
}

/**
 * Generic notification email for experts (e.g. account updates, security
 * alerts, marketplace events). Renders a heading, a body block with the
 * notification message, and an optional call-to-action button.
 *
 * Realistic sample values live only in `PreviewProps` so React Email's dev
 * preview is rich while production rendering can never inherit them.
 *
 * @example
 * ```tsx
 * <ExpertNotificationEmail
 *   expertName="Patricia Mota"
 *   notificationTitle="Account update"
 *   notificationMessage="Your payout has been sent to your bank account."
 *   actionUrl="https://eleva.care/dashboard/earnings"
 *   actionText="View earnings"
 * />
 * ```
 */
export const ExpertNotificationEmail = ({
  expertName = 'Expert',
  notificationTitle = 'You have a new notification',
  notificationMessage = '',
  actionUrl,
  actionText,
  locale = 'en',
}: ExpertNotificationEmailProps) => {
  const subject = `${notificationTitle} - Eleva Care`;
  // Only append the message snippet when there's actually a message, so we
  // don't end up with "You have a new notification - ..." in the inbox
  // preview. Only add the ellipsis when the message was actually truncated.
  const trimmedMessage = notificationMessage.trim();
  const previewText = trimmedMessage.length
    ? `${notificationTitle} - ${
        trimmedMessage.length > 100 ? `${trimmedMessage.substring(0, 100)}...` : trimmedMessage
      }`
    : notificationTitle;

  return (
    <EmailLayout
      subject={subject}
      previewText={previewText}
      headerVariant="branded"
      footerVariant="default"
      locale={locale}
    >
      <Heading
        style={{
          color: '#006D77',
          fontSize: '24px',
          marginBottom: '16px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: '600',
        }}
      >
        Olá, {expertName}
      </Heading>

      <Text
        style={{
          color: '#2D3748',
          fontSize: '18px',
          fontWeight: '500',
          marginBottom: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {notificationTitle}
      </Text>

      {trimmedMessage.length > 0 && (
        <Section
          style={{
            backgroundColor: '#F0FDFF',
            border: '1px solid #B8F5FF',
            borderRadius: '12px',
            padding: '24px',
            margin: '24px 0',
          }}
        >
          <Text
            style={{
              color: '#234E52',
              fontSize: '16px',
              lineHeight: '1.6',
              margin: '0',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {trimmedMessage}
          </Text>
        </Section>
      )}

      {actionUrl && actionText && (
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <EmailButton href={actionUrl} variant="primary" size="lg">
            {actionText}
          </EmailButton>
        </Section>
      )}

      <Hr
        style={{
          border: 'none',
          borderTop: '1px solid #E2E8F0',
          margin: '32px 0 24px 0',
        }}
      />

      <Text
        style={{
          color: '#718096',
          fontSize: '14px',
          lineHeight: '1.6',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        Este email foi enviado pela Eleva Care. Se não esperava receber este email, pode ignorá-lo
        com segurança.
      </Text>
    </EmailLayout>
  );
};

export default ExpertNotificationEmail;

// Sample data for React Email preview
ExpertNotificationEmail.PreviewProps = {
  expertName: 'Dr. Maria Santos',
  notificationTitle: 'New Appointment Request',
  notificationMessage:
    'You have received a new appointment request from João Silva for a cardiology consultation. The client is requesting a 60-minute consultation for next Tuesday at 2:30 PM. Please review the request and confirm your availability.',
  actionUrl: 'https://eleva.care/dashboard/appointments',
  actionText: 'View Appointments',
} as ExpertNotificationEmailProps;
