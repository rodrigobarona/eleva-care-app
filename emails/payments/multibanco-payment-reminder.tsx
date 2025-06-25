import * as React from 'react';
import { EmailButton, EmailLayout } from '@/components/emails';
import { Heading, Hr, Section, Text } from '@react-email/components';

interface MultibancoPaymentReminderProps {
  customerName?: string;
  expertName?: string;
  serviceName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  timezone?: string;
  duration?: number;
  multibancoEntity?: string;
  multibancoReference?: string;
  multibancoAmount?: string;
  voucherExpiresAt?: string;
  hostedVoucherUrl?: string;
  customerNotes?: string;
  reminderType?: string;
  daysRemaining?: number;
}

export default function MultibancoPaymentReminderTemplate({
  customerName = 'João Silva',
  expertName = 'Dr. Maria Santos',
  serviceName = 'Consulta de Cardiologia',
  appointmentDate = '2024-02-19',
  appointmentTime = '14:30',
  timezone = 'Europe/Lisbon',
  duration = 60,
  multibancoEntity = '12345',
  multibancoReference = '987654321',
  multibancoAmount = '75.00',
  voucherExpiresAt = '2024-02-20',
  hostedVoucherUrl = 'https://eleva.care/payment/voucher/123',
  customerNotes: _customerNotes = '',
  reminderType = 'urgent',
  daysRemaining = 1,
}: MultibancoPaymentReminderProps) {
  const isUrgent = reminderType === 'urgent' || daysRemaining <= 1;
  const subject = `${isUrgent ? 'URGENT: ' : ''}Payment Reminder - Appointment with ${expertName}`;
  const previewText = `${isUrgent ? 'URGENT: ' : ''}Your payment for the appointment with ${expertName} expires soon`;

  return (
    <EmailLayout
      subject={subject}
      previewText={previewText}
      headerVariant="default"
      footerVariant="default"
    >
      {isUrgent && (
        <Section
          style={{
            backgroundColor: '#FED7D7',
            border: '2px solid #F56565',
            padding: '20px',
            borderRadius: '12px',
            margin: '0 0 24px 0',
            textAlign: 'center',
          }}
        >
          <Text
            style={{
              color: '#C53030',
              fontWeight: '600',
              margin: '0',
              fontSize: '18px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            ⚠️ Don&apos;t lose your appointment! Payment expires in {daysRemaining} day
            {daysRemaining !== 1 ? 's' : ''}.
          </Text>
        </Section>
      )}

      <Heading
        style={{
          color: '#006D77',
          fontSize: '28px',
          fontWeight: '600',
          marginBottom: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        Payment Reminder - {serviceName}
      </Heading>

      <Text
        style={{
          color: '#4A5568',
          fontSize: '16px',
          lineHeight: '1.6',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        Hello {customerName},
      </Text>

      <Text
        style={{
          color: '#4A5568',
          fontSize: '16px',
          lineHeight: '1.6',
          marginBottom: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        This is a {reminderType} reminder that your payment for the appointment with{' '}
        <strong>{expertName}</strong> is still pending and will expire soon.
      </Text>

      {/* Appointment Details */}
      <Section
        style={{
          backgroundColor: '#F0FDFF',
          border: '1px solid #B8F5FF',
          padding: '24px',
          borderRadius: '12px',
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
          <strong>Time:</strong> {appointmentTime} ({timezone})
        </Text>
        <Text
          style={{
            color: '#234E52',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Duration:</strong> {duration} minutes
        </Text>
      </Section>

      {/* Multibanco Payment Details */}
      <Section
        style={{
          backgroundColor: isUrgent ? '#FED7D7' : '#FFF5F5',
          border: isUrgent ? '2px solid #C53030' : '1px solid #FED7D7',
          padding: '24px',
          borderRadius: '12px',
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
          💳 Multibanco Payment Details
        </Heading>
        <Text
          style={{
            color: '#744210',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Entity:</strong> {multibancoEntity}
        </Text>
        <Text
          style={{
            color: '#744210',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Reference:</strong> {multibancoReference}
        </Text>
        <Text
          style={{
            color: '#744210',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Amount:</strong> €{multibancoAmount}
        </Text>
        <Text
          style={{
            color: '#C53030',
            margin: '8px 0',
            fontSize: '16px',
            fontWeight: '600',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Expires:</strong> {voucherExpiresAt}
        </Text>
      </Section>

      <Text
        style={{
          color: '#4A5568',
          fontSize: '16px',
          lineHeight: '1.6',
          marginBottom: '32px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <strong>Action Required:</strong> Complete your payment now to secure your healthcare
        appointment. We&apos;re here to help if you need any assistance.
      </Text>

      <Section style={{ textAlign: 'center', margin: '32px 0' }}>
        <EmailButton href={hostedVoucherUrl} variant={isUrgent ? 'danger' : 'primary'} size="lg">
          {isUrgent ? '🚨 PAY NOW - EXPIRES SOON!' : 'Complete Payment'}
        </EmailButton>
      </Section>

      {/* Warning Section */}
      <Section
        style={{
          backgroundColor: '#FEF5E7',
          border: '1px solid #F6E05E',
          padding: '20px',
          borderRadius: '8px',
          margin: '24px 0',
        }}
      >
        <Text
          style={{
            color: '#744210',
            fontSize: '14px',
            margin: '0',
            lineHeight: '1.6',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>What happens if I don&apos;t pay in time?</strong>
          <br />
          If payment is not received by the expiration date, your appointment will be automatically
          cancelled and the time slot will become available to other patients.
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
        Need help with payment? Contact our support team and we&apos;ll be happy to assist you.
      </Text>
    </EmailLayout>
  );
}
