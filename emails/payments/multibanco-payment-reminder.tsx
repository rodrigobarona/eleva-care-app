import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import React from 'react';

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

  return (
    <Html>
      <Head />
      <Preview>
        {isUrgent ? 'URGENT: ' : ''}Payment Reminder - Appointment with {expertName}
      </Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'DM Sans, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff' }}>
          <Section style={{ padding: '40px' }}>
            {isUrgent && (
              <Section
                style={{
                  backgroundColor: '#fed7d7',
                  padding: '15px',
                  borderRadius: '8px',
                  margin: '0 0 20px 0',
                  textAlign: 'center',
                }}
              >
                <Text
                  style={{ color: '#c53030', fontWeight: 'bold', margin: '0', fontSize: '18px' }}
                >
                  ⚠️ Don&apos;t lose your appointment! Payment expires in {daysRemaining} day
                  {daysRemaining !== 1 ? 's' : ''}.
                </Text>
              </Section>
            )}

            <Heading style={{ color: '#1a365d', fontSize: '24px', marginBottom: '20px' }}>
              Payment Reminder - {serviceName}
            </Heading>

            <Text style={{ color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
              Hello {customerName},
            </Text>

            <Text style={{ color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
              This is a {reminderType} reminder that your payment for the appointment with{' '}
              <strong>{expertName}</strong> is still pending and will expire soon.
            </Text>

            <Section
              style={{
                backgroundColor: '#e6fffa',
                padding: '20px',
                borderRadius: '8px',
                margin: '20px 0',
              }}
            >
              <Heading style={{ color: '#234e52', fontSize: '18px', margin: '0 0 10px 0' }}>
                Appointment Details
              </Heading>
              <Text style={{ color: '#234e52', margin: '5px 0' }}>
                <strong>Service:</strong> {serviceName}
              </Text>
              <Text style={{ color: '#234e52', margin: '5px 0' }}>
                <strong>Date:</strong> {appointmentDate}
              </Text>
              <Text style={{ color: '#234e52', margin: '5px 0' }}>
                <strong>Time:</strong> {appointmentTime} ({timezone})
              </Text>
              <Text style={{ color: '#234e52', margin: '5px 0' }}>
                <strong>Duration:</strong> {duration} minutes
              </Text>
            </Section>

            <Section
              style={{
                backgroundColor: isUrgent ? '#fed7d7' : '#fff5f5',
                padding: '20px',
                borderRadius: '8px',
                margin: '20px 0',
                border: isUrgent ? '2px solid #c53030' : 'none',
              }}
            >
              <Heading style={{ color: '#c53030', fontSize: '18px', margin: '0 0 10px 0' }}>
                Multibanco Payment Details
              </Heading>
              <Text style={{ color: '#c53030', margin: '5px 0' }}>
                <strong>Entity:</strong> {multibancoEntity}
              </Text>
              <Text style={{ color: '#c53030', margin: '5px 0' }}>
                <strong>Reference:</strong> {multibancoReference}
              </Text>
              <Text style={{ color: '#c53030', margin: '5px 0' }}>
                <strong>Amount:</strong> €{multibancoAmount}
              </Text>
              <Text style={{ color: '#c53030', margin: '5px 0', fontWeight: 'bold' }}>
                <strong>Expires:</strong> {voucherExpiresAt}
              </Text>
            </Section>

            <Text style={{ color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
              <strong>Action Required:</strong> Complete your payment now to secure your healthcare
              appointment. We&apos;re here to help if you need any assistance.
            </Text>

            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Link
                href={hostedVoucherUrl}
                style={{
                  backgroundColor: isUrgent ? '#c53030' : '#3182ce',
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}
              >
                {isUrgent ? '🚨 PAY NOW - EXPIRES SOON!' : 'Complete Payment'}
              </Link>
            </Section>

            <Section
              style={{
                backgroundColor: '#fef5e7',
                padding: '15px',
                borderRadius: '8px',
                margin: '20px 0',
              }}
            >
              <Text style={{ color: '#744210', fontSize: '14px', margin: '0' }}>
                <strong>What happens if I don&apos;t pay in time?</strong>
                <br />
                If payment is not received by the expiration date, your appointment will be
                automatically cancelled and the time slot will become available to other patients.
              </Text>
            </Section>

            <Hr style={{ borderColor: '#e2e8f0', margin: '30px 0' }} />

            <Text style={{ color: '#718096', fontSize: '14px', lineHeight: '1.6' }}>
              Need help with payment? Contact our support team and we&apos;ll be happy to assist
              you.
            </Text>

            <Text style={{ color: '#718096', fontSize: '14px', lineHeight: '1.6' }}>
              Best regards,
              <br />
              The Eleva Care Team
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
