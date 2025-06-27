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
  locale?: string;
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
  locale = 'en',
}: MultibancoBookingPendingProps) {
  // Internationalization support
  const translations = {
    en: {
      subject: `Appointment with ${expertName} - Payment Pending via Multibanco`,
      previewText: `Complete your booking with ${expertName} by paying via Multibanco`,
      title: 'Payment Pending - Complete Your Booking',
      greeting: 'Hello',
      mainMessage: `We've reserved your appointment with <strong>${expertName}</strong> and are waiting for your payment confirmation via Multibanco.`,
      appointmentDetails: 'Appointment Details',
      paymentDetails: 'Multibanco Payment Details',
      service: 'Service',
      date: 'Date',
      time: 'Time',
      duration: 'Duration',
      notes: 'Notes',
      entity: 'Entity',
      reference: 'Reference',
      amount: 'Amount',
      expires: 'Expires',
      instructions:
        'To complete your booking, please pay via Multibanco using the details above or visit your payment voucher:',
      viewVoucher: 'View Payment Voucher',
      support: `If you have any questions or need assistance, please don't hesitate to contact our support team.`,
      minutes: 'minutes',
    },
    pt: {
      subject: `Consulta com ${expertName} - Pagamento Pendente via Multibanco`,
      previewText: `Complete a sua marcação com ${expertName} pagando via Multibanco`,
      title: 'Pagamento Pendente - Complete a Sua Marcação',
      greeting: 'Olá',
      mainMessage: `Reservámos a sua consulta com <strong>${expertName}</strong> e aguardamos a confirmação do pagamento via Multibanco.`,
      appointmentDetails: 'Detalhes da Consulta',
      paymentDetails: 'Detalhes do Pagamento Multibanco',
      service: 'Serviço',
      date: 'Data',
      time: 'Hora',
      duration: 'Duração',
      notes: 'Notas',
      entity: 'Entidade',
      reference: 'Referência',
      amount: 'Valor',
      expires: 'Expira',
      instructions:
        'Para completar a sua marcação, pague via Multibanco usando os detalhes acima ou visite o seu voucher de pagamento:',
      viewVoucher: 'Ver Voucher de Pagamento',
      support:
        'Se tiver alguma dúvida ou precisar de ajuda, não hesite em contactar a nossa equipa de apoio.',
      minutes: 'minutos',
    },
  };

  // Get translations for the current locale, fallback to English
  const t = translations[locale as keyof typeof translations] || translations.en;

  const subject = t.subject;
  const previewText = t.previewText;

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
        {t.title}
      </Heading>

      <Text
        style={{
          color: '#4A5568',
          fontSize: '16px',
          lineHeight: '1.6',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {t.greeting} {customerName},
      </Text>

      <Text
        style={{
          color: '#4A5568',
          fontSize: '16px',
          lineHeight: '1.6',
          marginBottom: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        dangerouslySetInnerHTML={{ __html: t.mainMessage }}
      />

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
          📅 {t.appointmentDetails}
        </Heading>
        <Text
          style={{
            color: '#234E52',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>{t.service}:</strong> {serviceName}
        </Text>
        <Text
          style={{
            color: '#234E52',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>{t.date}:</strong> {appointmentDate}
        </Text>
        <Text
          style={{
            color: '#234E52',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>{t.time}:</strong> {appointmentTime} ({timezone})
        </Text>
        <Text
          style={{
            color: '#234E52',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>{t.duration}:</strong> {duration} {t.minutes}
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
            <strong>{t.notes}:</strong> {customerNotes}
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
          💳 {t.paymentDetails}
        </Heading>
        <Text
          style={{
            color: '#744210',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>{t.entity}:</strong> {multibancoEntity}
        </Text>
        <Text
          style={{
            color: '#744210',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>{t.reference}:</strong> {multibancoReference}
        </Text>
        <Text
          style={{
            color: '#744210',
            margin: '8px 0',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <strong>{t.amount}:</strong> €{multibancoAmount}
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
          <strong>{t.expires}:</strong> {voucherExpiresAt}
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
        {t.instructions}
      </Text>

      <Section style={{ textAlign: 'center', margin: '32px 0' }}>
        <EmailButton href={hostedVoucherUrl} variant="primary" size="lg">
          {t.viewVoucher}
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
        {t.support}
      </Text>
    </EmailLayout>
  );
}
