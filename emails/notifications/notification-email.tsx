import * as React from 'react';
import { EmailButton, EmailLayout } from '@/components/emails';
import { Heading, Section, Text } from '@react-email/components';

interface NotificationEmailProps {
  title?: string;
  message?: string;
  userName?: string;
  actionUrl?: string;
  actionText?: string;
  locale?: string;
}

export default function NotificationEmail({
  title = 'Notification',
  message = 'You have a new notification from Eleva Care',
  userName,
  actionUrl,
  actionText,
}: NotificationEmailProps) {
  const greeting = userName ? `Hi ${userName},` : 'Hello,';
  const subject = `${title} - Eleva Care`;
  const previewText = `${title} - ${message.substring(0, 100)}...`;

  return (
    <EmailLayout
      subject={subject}
      previewText={previewText}
      headerVariant="default"
      footerVariant="default"
    >
      <Heading
        style={{
          fontSize: '28px',
          fontWeight: '600',
          color: '#006D77',
          margin: '0 0 24px 0',
          letterSpacing: '-0.025em',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {title}
      </Heading>

      <Text
        style={{
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#4A5568',
          margin: '0 0 16px 0',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {greeting}
      </Text>

      <Text
        style={{
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#4A5568',
          margin: '0 0 32px 0',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {message}
      </Text>

      {actionUrl && actionText && (
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <EmailButton href={actionUrl} variant="primary" size="lg">
            {actionText}
          </EmailButton>
        </Section>
      )}

      <Text
        style={{
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#4A5568',
          margin: '40px 0 16px 0',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        Thank you for using Eleva Care.
      </Text>

      <Text
        style={{
          fontSize: '14px',
          color: '#718096',
          margin: '0',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontStyle: 'italic',
        }}
      >
        — The Eleva Care Team
      </Text>
    </EmailLayout>
  );
}

// Define preview props for React Email
NotificationEmail.PreviewProps = {
  title: 'Appointment Reminder',
  message:
    'Your appointment with Dr. Smith is scheduled for tomorrow at 2:00 PM. Please arrive 15 minutes early.',
  userName: 'John Doe',
  actionUrl: '/appointments/123',
  actionText: 'View Appointment',
};
