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

interface PaymentConfirmationEmailProps {
  customerName?: string;
  expertName?: string;
  serviceName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  amount?: string;
  currency?: string;
  paymentMethod?: string;
  transactionId?: string;
  appointmentUrl?: string;
  receiptUrl?: string;
}

export const PaymentConfirmationEmail = ({
  customerName = 'João Silva',
  expertName = 'Dr. Maria Santos',
  serviceName = 'Consulta de Cardiologia',
  appointmentDate = 'Monday, February 19, 2024',
  appointmentTime = '2:30 PM - 3:30 PM',
  amount = '75.00',
  currency = 'EUR',
  paymentMethod = 'Credit Card',
  transactionId = 'TXN_123456789',
  appointmentUrl = 'https://eleva.care/appointments/123',
  receiptUrl = 'https://eleva.care/receipts/123',
}: PaymentConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Payment confirmed for your appointment with {expertName}</Preview>
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
          <Section style={successBadge}>
            <Text style={successText}>✓ Payment Confirmed</Text>
          </Section>

          <Heading style={h1}>Thank you for your payment!</Heading>

          <Text style={text}>
            Hello {customerName}, your payment has been successfully processed. Your appointment is
            now confirmed.
          </Text>

          <Section style={paymentCard}>
            <Heading style={h2}>Payment Details</Heading>

            <Text style={paymentDetail}>
              <strong>Amount:</strong> {currency} {amount}
            </Text>

            <Text style={paymentDetail}>
              <strong>Payment Method:</strong> {paymentMethod}
            </Text>

            <Text style={paymentDetail}>
              <strong>Transaction ID:</strong> {transactionId}
            </Text>

            <Text style={paymentDetail}>
              <strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}
            </Text>
          </Section>

          <Section style={appointmentCard}>
            <Heading style={h2}>Appointment Details</Heading>

            <Text style={appointmentDetail}>
              <strong>Service:</strong> {serviceName}
            </Text>

            <Text style={appointmentDetail}>
              <strong>Healthcare Provider:</strong> {expertName}
            </Text>

            <Text style={appointmentDetail}>
              <strong>Date:</strong> {appointmentDate}
            </Text>

            <Text style={appointmentDetail}>
              <strong>Time:</strong> {appointmentTime}
            </Text>
          </Section>

          <Section style={buttonSection}>
            <Button href={appointmentUrl} style={primaryButton}>
              View Appointment
            </Button>
            <Button href={receiptUrl} style={secondaryButton}>
              Download Receipt
            </Button>
          </Section>

          <Section style={nextStepsSection}>
            <Heading style={h3}>What&apos;s next?</Heading>
            <Text style={listItem}>• You will receive a calendar invite with meeting details</Text>
            <Text style={listItem}>• Check your email for appointment reminders</Text>
            <Text style={listItem}>
              • Prepare any questions or medical history for your consultation
            </Text>
            <Text style={listItem}>• Join the video call 5 minutes before your appointment</Text>
          </Section>

          <Hr style={hr} />

          <Text style={footerText}>
            If you have any questions about your payment or appointment, please contact our support
            team.
          </Text>

          <Text style={footerText}>
            <Link href="https://eleva.care/contact" style={link}>
              Contact Support
            </Link>
            {' | '}
            <Link href="https://eleva.care/privacy" style={link}>
              Privacy Policy
            </Link>
            {' | '}
            <Link href="https://eleva.care/refunds" style={link}>
              Refund Policy
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default PaymentConfirmationEmail;

// Sample data for React Email preview
PaymentConfirmationEmail.PreviewProps = {
  customerName: 'João Silva',
  expertName: 'Dr. Maria Santos',
  serviceName: 'Consulta de Cardiologia',
  appointmentDate: 'Monday, February 19, 2024',
  appointmentTime: '2:30 PM - 3:30 PM',
  amount: '75.00',
  currency: 'EUR',
  paymentMethod: 'Credit Card (•••• 4242)',
  transactionId: 'TXN_123456789',
  appointmentUrl: 'https://eleva.care/appointments/123',
  receiptUrl: 'https://eleva.care/receipts/123',
} as PaymentConfirmationEmailProps;

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

const successBadge = {
  backgroundColor: '#d4edda',
  border: '1px solid #c3e6cb',
  borderRadius: '20px',
  padding: '8px 16px',
  textAlign: 'center' as const,
  margin: '20px auto',
  maxWidth: '200px',
};

const successText = {
  color: '#155724',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '20px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px',
  padding: '0',
};

const h3 = {
  color: '#333',
  fontSize: '16px',
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

const paymentCard = {
  backgroundColor: '#e8f5e8',
  border: '2px solid #28a745',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const appointmentCard = {
  backgroundColor: '#e3f2fd',
  border: '1px solid #2196f3',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const paymentDetail = {
  color: '#155724',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '8px 0',
};

const appointmentDetail = {
  color: '#1565c0',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '8px 0',
};

const nextStepsSection = {
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
  margin: '32px 0',
};

const primaryButton = {
  backgroundColor: '#007bff',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '0 8px 8px 8px',
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
  margin: '0 8px 8px 8px',
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
