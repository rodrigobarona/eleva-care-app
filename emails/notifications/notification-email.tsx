import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface NotificationEmailProps {
  title?: string;
  message?: string;
  userName?: string;
  actionUrl?: string;
  actionText?: string;
}

export default function NotificationEmail({
  title = 'Notification',
  message = 'You have a new notification from Eleva Care',
  userName,
  actionUrl,
  actionText,
}: NotificationEmailProps) {
  const greeting = userName ? `Hi ${userName},` : 'Hello,';

  return (
    <Html>
      <Head />
      <Preview>{title} - Eleva Care</Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'DM Sans, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff' }}>
          <Section style={{ padding: '40px 24px' }}>
            <Heading
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#111827',
                margin: '0 0 16px 0',
                letterSpacing: '-0.025em',
              }}
            >
              {title}
            </Heading>

            <Text
              style={{
                fontSize: '16px',
                lineHeight: '24px',
                color: '#374151',
                margin: '0 0 16px 0',
              }}
            >
              {greeting}
            </Text>

            <Text
              style={{
                fontSize: '16px',
                lineHeight: '24px',
                color: '#374151',
                margin: '0 0 24px 0',
              }}
            >
              {message}
            </Text>

            {actionUrl && actionText && (
              <Section style={{ textAlign: 'center', margin: '32px 0' }}>
                <a
                  href={actionUrl}
                  style={{
                    backgroundColor: '#006D77',
                    color: '#ffffff',
                    padding: '12px 24px',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'inline-block',
                  }}
                >
                  {actionText}
                </a>
              </Section>
            )}

            <Text
              style={{
                fontSize: '16px',
                lineHeight: '24px',
                color: '#374151',
                margin: '32px 0 0 0',
              }}
            >
              Thank you for using Eleva Care.
            </Text>

            <Text
              style={{
                fontSize: '14px',
                color: '#6b7280',
                marginTop: '24px',
              }}
            >
              — The Eleva Care Team
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
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
