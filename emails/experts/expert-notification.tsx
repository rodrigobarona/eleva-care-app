import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface ExpertNotificationEmailProps {
  expertName?: string;
  notificationTitle?: string;
  notificationMessage?: string;
  actionUrl?: string;
  actionText?: string;
}

export const ExpertNotificationEmail = ({
  expertName = 'Dr. Maria Santos',
  notificationTitle = 'New Appointment Request',
  notificationMessage = 'You have received a new appointment request from João Silva for a cardiology consultation. Please review the request and confirm your availability.',
  actionUrl = 'https://eleva.care/dashboard/appointments',
  actionText = 'View Appointments',
}: ExpertNotificationEmailProps) => (
  <Html>
    <Head />
    <Preview>{notificationTitle} - Eleva Care</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img
            src="https://eleva.care/logo.png"
            width="120"
            height="36"
            alt="Eleva Care"
            style={logo}
          />
        </Section>

        <Section style={content}>
          <Heading style={h1}>Olá, {expertName}</Heading>

          <Text style={text}>{notificationTitle}</Text>

          <Section style={notificationCard}>
            <Text style={notificationText}>{notificationMessage}</Text>
          </Section>

          {actionUrl && (
            <Section style={buttonSection}>
              <Button href={actionUrl} style={button}>
                {actionText}
              </Button>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={footerText}>
            Este email foi enviado pela Eleva Care. Se não esperava receber este email, pode
            ignorá-lo com segurança.
          </Text>

          <Text style={footerText}>
            <Link href="https://eleva.care/privacy" style={link}>
              Política de Privacidade
            </Link>
            {' | '}
            <Link href="https://eleva.care/terms" style={link}>
              Termos de Serviço
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default ExpertNotificationEmail;

// Sample data for React Email preview
ExpertNotificationEmail.PreviewProps = {
  expertName: 'Dr. Maria Santos',
  notificationTitle: 'New Appointment Request',
  notificationMessage:
    'You have received a new appointment request from João Silva for a cardiology consultation. The patient is requesting a 60-minute consultation for next Tuesday at 2:30 PM. Please review the request and confirm your availability.',
  actionUrl: 'https://eleva.care/dashboard/appointments',
  actionText: 'View Appointments',
} as ExpertNotificationEmailProps;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const logoSection = {
  padding: '32px 0',
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto',
};

const content = {
  padding: '0 48px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const notificationCard = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e1e5e9',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const notificationText = {
  color: '#495057',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#007bff',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const hr = {
  borderColor: '#e1e5e9',
  margin: '32px 0',
};

const footerText = {
  color: '#6c757d',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '16px 0 0',
  textAlign: 'center' as const,
};

const link = {
  color: '#007bff',
  textDecoration: 'underline',
};
