import { EmailButton, EmailLayout } from '@/components/emails';
import { Heading, Hr, Section, Text } from '@react-email/components';
import React from 'react';

interface AppointmentConfirmationProps {
  expertName?: string;
  clientName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  timezone?: string;
  appointmentDuration?: string;
  eventTitle?: string;
  meetLink?: string;
  notes?: string;
}

export default function AppointmentConfirmationTemplate({
  expertName = 'Dr. Maria Santos',
  clientName = 'João Silva',
  appointmentDate = '2024-02-15',
  appointmentTime = '10:00',
  timezone = 'Europe/Lisbon',
  appointmentDuration = '60 minutes',
  eventTitle = 'Consulta de Cardiologia',
  meetLink = 'https://eleva.care/meet/apt_conf_123',
  notes = 'First consultation - health check',
}: AppointmentConfirmationProps) {
  const subject = `Appointment Confirmed: ${eventTitle} with ${expertName}`;
  const previewText = `Your appointment with ${expertName} is confirmed for ${appointmentDate} at ${appointmentTime}`;

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
          backgroundColor: '#d4edda',
          padding: '20px',
          borderRadius: '8px',
          margin: '0 0 30px 0',
          textAlign: 'center',
        }}
      >
        <Text style={{ color: '#155724', fontWeight: 'bold', margin: '0', fontSize: '20px' }}>
          ✅ Appointment Confirmed!
        </Text>
      </Section>

      <Heading
        style={{
          color: '#1a365d',
          fontSize: '24px',
          marginBottom: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        Your Appointment is Confirmed
      </Heading>

      <Text
        style={{
          color: '#4a5568',
          fontSize: '16px',
          lineHeight: '1.6',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        Hello {clientName},
      </Text>

      <Text
        style={{
          color: '#4a5568',
          fontSize: '16px',
          lineHeight: '1.6',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        Great news! Your appointment with <strong>{expertName}</strong> has been confirmed. We look
        forward to providing you with excellent care.
      </Text>

      {/* Appointment Details */}
      <Section
        style={{
          backgroundColor: '#e6fffa',
          padding: '25px',
          borderRadius: '8px',
          margin: '25px 0',
        }}
      >
        <Heading
          style={{
            color: '#234e52',
            fontSize: '18px',
            margin: '0 0 15px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          📅 Appointment Details
        </Heading>
        <Text
          style={{
            color: '#234e52',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Service:</strong> {eventTitle}
        </Text>
        <Text
          style={{
            color: '#234e52',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Date:</strong> {appointmentDate}
        </Text>
        <Text
          style={{
            color: '#234e52',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Time:</strong> {appointmentTime} ({timezone})
        </Text>
        <Text
          style={{
            color: '#234e52',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Duration:</strong> {appointmentDuration}
        </Text>
        <Text
          style={{
            color: '#234e52',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>Healthcare Provider:</strong> {expertName}
        </Text>
        {notes && (
          <Text
            style={{
              color: '#234e52',
              margin: '8px 0',
              fontSize: '16px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <strong>Notes:</strong> {notes}
          </Text>
        )}
      </Section>

      {/* Virtual Meeting Section */}
      <Section
        style={{
          backgroundColor: '#fff3cd',
          padding: '20px',
          borderRadius: '8px',
          margin: '25px 0',
        }}
      >
        <Heading
          style={{
            color: '#856404',
            fontSize: '18px',
            margin: '0 0 10px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          🔗 Join Your Virtual Appointment
        </Heading>
        <Text
          style={{
            color: '#856404',
            fontSize: '14px',
            lineHeight: '1.6',
            marginBottom: '15px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          When it&apos;s time for your appointment, simply click the button below to join the
          virtual consultation:
        </Text>

        <Section style={{ textAlign: 'center', margin: '15px 0' }}>
          <EmailButton href={meetLink} variant="primary" size="lg">
            🎥 Join Video Call
          </EmailButton>
        </Section>

        <Text
          style={{
            color: '#856404',
            fontSize: '12px',
            lineHeight: '1.4',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          💡 <strong>Tip:</strong> We recommend joining 2-3 minutes early to test your camera and
          microphone.
        </Text>
      </Section>

      {/* Preparation Section */}
      <Section
        style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          margin: '25px 0',
        }}
      >
        <Heading
          style={{
            color: '#495057',
            fontSize: '16px',
            margin: '0 0 10px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          📋 Before Your Appointment
        </Heading>
        <Text
          style={{
            color: '#495057',
            fontSize: '14px',
            lineHeight: '1.6',
            margin: '5px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          • Ensure you have a stable internet connection
        </Text>
        <Text
          style={{
            color: '#495057',
            fontSize: '14px',
            lineHeight: '1.6',
            margin: '5px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          • Prepare any questions you want to discuss
        </Text>
        <Text
          style={{
            color: '#495057',
            fontSize: '14px',
            lineHeight: '1.6',
            margin: '5px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          • Have your medical history or previous reports ready
        </Text>
        <Text
          style={{
            color: '#495057',
            fontSize: '14px',
            lineHeight: '1.6',
            margin: '5px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          • Find a quiet, private space for the consultation
        </Text>
      </Section>

      <Hr style={{ borderColor: '#e2e8f0', margin: '30px 0' }} />

      <Text
        style={{
          color: '#4a5568',
          fontSize: '16px',
          lineHeight: '1.6',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <strong>Need to reschedule or cancel?</strong>
        <br />
        Please contact us at least 24 hours in advance to make changes to your appointment.
      </Text>

      <Text
        style={{
          color: '#718096',
          fontSize: '14px',
          lineHeight: '1.6',
          marginTop: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        If you have any questions or need technical support, don&apos;t hesitate to reach out to our
        team.
      </Text>

      <Section style={{ textAlign: 'center', marginTop: '30px' }}>
        <Text
          style={{
            color: '#4a5568',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          Thank you for choosing Eleva Care!
        </Text>
      </Section>
    </EmailLayout>
  );
}
