import * as React from 'react';
import { EmailButton, EmailLayout } from '@/components/emails';
import { Heading, Hr, Section, Text } from '@react-email/components';

interface MultibancoBookingPendingProps {
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
}

export default function MultibancoBookingPendingTemplate({
  customerName = 'João Silva',
  expertName = 'Dr. Maria Santos',
  serviceName = 'Consulta de Cardiologia',
  appointmentDate = '2024-02-15',
  appointmentTime = '10:00',
  timezone = 'Europe/Lisbon',
  duration = 60,
  multibancoEntity = '12345',
  multibancoReference = '987654321',
  multibancoAmount = '75.00',
  voucherExpiresAt = '2024-02-12',
  hostedVoucherUrl = 'https://eleva.care/payment/voucher/123',
  customerNotes = 'First consultation - health check',
}: MultibancoBookingPendingProps) {
  const subject = `Appointment with ${expertName} - Payment Pending via Multibanco`;
  const previewText = `Complete your booking with ${expertName} by paying via Multibanco`;

  return (
    <EmailLayout
      subject={subject}
      previewText={previewText}
      headerVariant="default"
      footerVariant="default"
    >
      <Heading
        style={{
          color: '#006D77',
          fontSize: '28px',
          fontWeight: '600',
          marginBottom: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        Payment Pending - Complete Your Booking
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
        We&apos;ve reserved your appointment with <strong>{expertName}</strong> and are waiting for
        your payment confirmation via Multibanco.
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
        {customerNotes && (
          <Text
            style={{
              color: '#234E52',
              margin: '8px 0',
              fontSize: '16px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <strong>Notes:</strong> {customerNotes}
          </Text>
        )}
      </Section>

      {/* Multibanco Payment Details */}
      <Section
        style={{
          backgroundColor: '#FFF5F5',
          border: '1px solid #FED7D7',
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
        To complete your booking, please pay via Multibanco using the details above or visit your
        payment voucher:
      </Text>

      <Section style={{ textAlign: 'center', margin: '32px 0' }}>
        <EmailButton href={hostedVoucherUrl} variant="primary" size="lg">
          View Payment Voucher
        </EmailButton>
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
        If you have any questions or need assistance, please don&apos;t hesitate to contact our
        support team.
      </Text>
    </EmailLayout>
  );
}
