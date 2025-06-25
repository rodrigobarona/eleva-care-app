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
  serviceName: _serviceName = 'Consulta de Cardiologia',
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
  return (
    <Html>
      <Head />
      <Preview>Appointment with {expertName} - Payment Pending via Multibanco</Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'DM Sans, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff' }}>
          <Section style={{ padding: '40px' }}>
            <Heading style={{ color: '#1a365d', fontSize: '24px', marginBottom: '20px' }}>
              Payment Pending - Complete Your Booking
            </Heading>

            <Text style={{ color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
              Hello {customerName},
            </Text>

            <Text style={{ color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
              We&apos;ve reserved your appointment with <strong>{expertName}</strong> and are
              waiting for your payment confirmation via Multibanco.
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
                <strong>Date:</strong> {appointmentDate}
              </Text>
              <Text style={{ color: '#234e52', margin: '5px 0' }}>
                <strong>Time:</strong> {appointmentTime} ({timezone})
              </Text>
              <Text style={{ color: '#234e52', margin: '5px 0' }}>
                <strong>Duration:</strong> {duration} minutes
              </Text>
              {customerNotes && (
                <Text style={{ color: '#234e52', margin: '5px 0' }}>
                  <strong>Notes:</strong> {customerNotes}
                </Text>
              )}
            </Section>

            <Section
              style={{
                backgroundColor: '#fff5f5',
                padding: '20px',
                borderRadius: '8px',
                margin: '20px 0',
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
              <Text style={{ color: '#c53030', margin: '5px 0' }}>
                <strong>Expires:</strong> {voucherExpiresAt}
              </Text>
            </Section>

            <Text style={{ color: '#4a5568', fontSize: '16px', lineHeight: '1.6' }}>
              To complete your booking, please pay via Multibanco using the details above or visit
              your payment voucher:
            </Text>

            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
              <Link
                href={hostedVoucherUrl}
                style={{
                  backgroundColor: '#3182ce',
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                }}
              >
                View Payment Voucher
              </Link>
            </Section>

            <Hr style={{ borderColor: '#e2e8f0', margin: '30px 0' }} />

            <Text style={{ color: '#718096', fontSize: '14px', lineHeight: '1.6' }}>
              If you have any questions or need assistance, please don&apos;t hesitate to contact
              our support team.
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
