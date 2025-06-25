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

interface AppointmentReminderEmailProps {
  patientName?: string;
  expertName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  timezone?: string;
  duration?: number;
  appointmentType?: string;
  meetingLink?: string;
  rescheduleUrl?: string;
  cancelUrl?: string;
}

export const AppointmentReminderEmail = ({
  patientName = 'João Silva',
  expertName = 'Dr. Maria Santos',
  appointmentDate = 'Monday, February 19, 2024',
  appointmentTime = '2:30 PM - 3:30 PM',
  timezone = 'Europe/Lisbon',
  duration = 60,
  appointmentType = 'Consulta de Cardiologia',
  meetingLink = 'https://meet.google.com/abc-defg-hij',
  rescheduleUrl = 'https://eleva.care/reschedule/123',
  cancelUrl = 'https://eleva.care/cancel/123',
}: AppointmentReminderEmailProps) => (
  <Html>
    <Head />
    <Preview>Reminder: Your appointment with {expertName} is tomorrow</Preview>
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
          <Heading style={h1}>Appointment Reminder</Heading>

          <Text style={text}>
            Hello {patientName}, this is a friendly reminder about your upcoming appointment.
          </Text>

          <Section style={appointmentCard}>
            <Heading style={h2}>{appointmentType}</Heading>

            <Text style={appointmentDetail}>
              <strong>Healthcare Provider:</strong> {expertName}
            </Text>

            <Text style={appointmentDetail}>
              <strong>Date:</strong> {appointmentDate}
            </Text>

            <Text style={appointmentDetail}>
              <strong>Time:</strong> {appointmentTime}
            </Text>

            <Text style={appointmentDetail}>
              <strong>Duration:</strong> {duration} minutes
            </Text>

            <Text style={appointmentDetail}>
              <strong>Timezone:</strong> {timezone}
            </Text>

            {meetingLink && (
              <Section style={buttonSection}>
                <Button href={meetingLink} style={primaryButton}>
                  Join Video Call
                </Button>
              </Section>
            )}
          </Section>

          <Section style={preparationSection}>
            <Heading style={h3}>How to prepare:</Heading>
            <Text style={listItem}>• Have your medical history and current medications ready</Text>
            <Text style={listItem}>• Prepare any questions you&apos;d like to discuss</Text>
            <Text style={listItem}>
              • Ensure you have a stable internet connection for video calls
            </Text>
            <Text style={listItem}>• Join the meeting 5 minutes early</Text>
          </Section>

          <Section style={actionSection}>
            <Button href={rescheduleUrl} style={secondaryButton}>
              Reschedule
            </Button>
            <Button href={cancelUrl} style={cancelButton}>
              Cancel
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footerText}>
            If you have any questions or need to make changes to your appointment, please contact
            our support team.
          </Text>

          <Text style={footerText}>
            <Link href="https://eleva.care/contact" style={link}>
              Contact Support
            </Link>
            {' | '}
            <Link href="https://eleva.care/privacy" style={link}>
              Privacy Policy
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

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
  rescheduleUrl: 'https://eleva.care/reschedule/123',
  cancelUrl: 'https://eleva.care/cancel/123',
} as AppointmentReminderEmailProps;

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
  textAlign: 'center' as const,
};

const h2 = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px',
  padding: '0',
};

const h3 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px',
  padding: '0',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  textAlign: 'center' as const,
};

const appointmentCard = {
  backgroundColor: '#e3f2fd',
  border: '2px solid #2196f3',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const appointmentDetail = {
  color: '#333',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '8px 0',
};

const preparationSection = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e1e5e9',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const listItem = {
  color: '#495057',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '20px 0',
};

const actionSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const primaryButton = {
  backgroundColor: '#28a745',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '0 8px',
};

const secondaryButton = {
  backgroundColor: '#6c757d',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 20px',
  margin: '0 8px',
};

const cancelButton = {
  backgroundColor: '#dc3545',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 20px',
  margin: '0 8px',
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
