import * as React from 'react';
import { EmailButton, EmailLayout } from '@/components/emails';
import { Heading, Hr, Section, Text } from '@react-email/components';

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
  locale?: string;
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
  locale = 'en-GB',
}: PaymentConfirmationEmailProps) => {
  const subject = `Payment confirmed for your appointment with ${expertName}`;
  const previewText = `Your payment of ${currency} ${amount} has been successfully processed. Your appointment is confirmed.`;

  return (
    <EmailLayout
      subject={subject}
      previewText={previewText}
      headerVariant="default"
      footerVariant="default"
    >
      {/* Success Banner */}
      <Section
        style={{
          backgroundColor: '#D4EDDA',
          border: '1px solid #C3E6CB',
          padding: '20px',
          borderRadius: '12px',
          margin: '0 0 32px 0',
          textAlign: 'center',
        }}
      >
        <Text
          style={{
            color: '#155724',
            fontWeight: '600',
            margin: '0',
            fontSize: '20px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          ✓ Payment Confirmed
        </Text>
      </Section>

      <Heading
        style={{
          color: '#006D77',
          fontSize: '28px',
          fontWeight: '600',
          margin: '0 0 24px 0',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        Thank you for your payment!
      </Heading>

      <Text
        style={{
          color: '#4A5568',
          fontSize: '16px',
          lineHeight: '1.6',
          marginBottom: '32px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        Hello {customerName}, your payment has been successfully processed. Your appointment is now
        confirmed.
      </Text>

      {/* Payment Details */}
      <Section
        style={{
          backgroundColor: '#FFF5F5',
          border: '1px solid #FED7D7',
          borderRadius: '12px',
          padding: '24px',
          margin: '24px 0',
        }}
      >
        <Heading
          style={{
            color: '#C53030',
            fontSize: '18px',
            fontWeight: '600',
            margin: '0 0 16px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          💳 Payment Details
        </Heading>

        <Text
          style={{
            color: '#744210',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Amount:</strong> {currency} {amount}
        </Text>

        <Text
          style={{
            color: '#744210',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Payment Method:</strong> {paymentMethod}
        </Text>

        <Text
          style={{
            color: '#744210',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Transaction ID:</strong> {transactionId}
        </Text>

        <Text
          style={{
            color: '#744210',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Date:</strong> {new Date().toLocaleDateString(locale)}
        </Text>
      </Section>

      {/* Appointment Details */}
      <Section
        style={{
          backgroundColor: '#F0FDFF',
          border: '1px solid #B8F5FF',
          borderRadius: '12px',
          padding: '24px',
          margin: '24px 0',
        }}
      >
        <Heading
          style={{
            color: '#006D77',
            fontSize: '18px',
            fontWeight: '600',
            margin: '0 0 16px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          📅 Appointment Details
        </Heading>

        <Text
          style={{
            color: '#234E52',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Service:</strong> {serviceName}
        </Text>

        <Text
          style={{
            color: '#234E52',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Healthcare Provider:</strong> {expertName}
        </Text>

        <Text
          style={{
            color: '#234E52',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Date:</strong> {appointmentDate}
        </Text>

        <Text
          style={{
            color: '#234E52',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Time:</strong> {appointmentTime}
        </Text>
      </Section>

      {/* Action Buttons */}
      <Section style={{ textAlign: 'center', margin: '32px 0' }}>
        <EmailButton
          href={appointmentUrl}
          variant="primary"
          size="lg"
          style={{ marginRight: '12px' }}
        >
          View Appointment
        </EmailButton>
        <EmailButton href={receiptUrl} variant="outline" size="lg">
          Download Receipt
        </EmailButton>
      </Section>

      {/* Next Steps */}
      <Section
        style={{
          backgroundColor: '#FEFEFE',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '20px',
          margin: '32px 0',
        }}
      >
        <Heading
          style={{
            color: '#2D3748',
            fontSize: '18px',
            fontWeight: '600',
            margin: '0 0 16px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          What&apos;s next?
        </Heading>
        <Text
          style={{
            color: '#4A5568',
            fontSize: '15px',
            lineHeight: '1.6',
            margin: '8px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          • You will receive a calendar invite with meeting details
        </Text>
        <Text
          style={{
            color: '#4A5568',
            fontSize: '15px',
            lineHeight: '1.6',
            margin: '8px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          • Check your email for appointment reminders
        </Text>
        <Text
          style={{
            color: '#4A5568',
            fontSize: '15px',
            lineHeight: '1.6',
            margin: '8px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          • Prepare any questions or medical history for your consultation
        </Text>
        <Text
          style={{
            color: '#4A5568',
            fontSize: '15px',
            lineHeight: '1.6',
            margin: '8px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          • Join the video call 5 minutes before your appointment
        </Text>
      </Section>

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
        If you have any questions about your payment or appointment, please contact our support
        team.
      </Text>
    </EmailLayout>
  );
};

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
