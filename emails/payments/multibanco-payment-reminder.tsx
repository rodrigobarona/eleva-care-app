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
  locale?: string;
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
  customerNotes = '',
  reminderType = 'urgent',
  daysRemaining = 1,
  locale = 'en',
}: MultibancoPaymentReminderProps) {
  const isUrgent = reminderType === 'urgent' || daysRemaining <= 1;

  // Internationalization support
  const translations = {
    en: {
      urgent: 'URGENT',
      subject: `Payment Reminder - Appointment with ${expertName}`,
      subjectUrgent: `URGENT: Payment Reminder - Appointment with ${expertName}`,
      previewText: `Your payment for the appointment with ${expertName} expires soon`,
      previewTextUrgent: `URGENT: Your payment for the appointment with ${expertName} expires soon`,
      title: `Payment Reminder - ${serviceName}`,
      greeting: 'Hello',
      reminderMessage: `This is a ${reminderType} reminder that your payment for the appointment with <strong>${expertName}</strong> is still pending and will expire soon.`,
      urgentWarning: `⚠️ Don't lose your appointment! Payment expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`,
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
      actionRequired:
        "<strong>Action Required:</strong> Complete your payment now to secure your healthcare appointment. We're here to help if you need any assistance.",
      payNowUrgent: '🚨 PAY NOW - EXPIRES SOON!',
      completePayment: 'Complete Payment',
      warningTitle: "What happens if I don't pay in time?",
      warningText:
        'If payment is not received by the expiration date, your appointment will be automatically cancelled and the time slot will become available to other patients.',
      support: "Need help with payment? Contact our support team and we'll be happy to assist you.",
      minutes: 'minutes',
    },
    pt: {
      urgent: 'URGENTE',
      subject: `Lembrete de Pagamento - Consulta com ${expertName}`,
      subjectUrgent: `URGENTE: Lembrete de Pagamento - Consulta com ${expertName}`,
      previewText: `O seu pagamento para a consulta com ${expertName} expira em breve`,
      previewTextUrgent: `URGENTE: O seu pagamento para a consulta com ${expertName} expira em breve`,
      title: `Lembrete de Pagamento - ${serviceName}`,
      greeting: 'Olá',
      reminderMessage: `Este é um lembrete ${reminderType === 'urgent' ? 'urgente' : 'gentil'} de que o seu pagamento para a consulta com <strong>${expertName}</strong> ainda está pendente e expirará em breve.`,
      urgentWarning: `⚠️ Não perca a sua consulta! O pagamento expira em ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}.`,
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
      actionRequired:
        '<strong>Ação Necessária:</strong> Complete o seu pagamento agora para garantir a sua consulta. Estamos aqui para ajudar se precisar de assistência.',
      payNowUrgent: '🚨 PAGAR AGORA - EXPIRA EM BREVE!',
      completePayment: 'Completar Pagamento',
      warningTitle: 'O que acontece se não pagar a tempo?',
      warningText:
        'Se o pagamento não for recebido até à data de expiração, a sua consulta será automaticamente cancelada e o horário ficará disponível para outros pacientes.',
      support:
        'Precisa de ajuda com o pagamento? Contacte a nossa equipa de apoio e ficaremos felizes em ajudá-lo.',
      minutes: 'minutos',
    },
  };

  // Get translations for the current locale, fallback to English
  const t = translations[locale as keyof typeof translations] || translations.en;

  const subject = isUrgent ? t.subjectUrgent : t.subject;
  const previewText = isUrgent ? t.previewTextUrgent : t.previewText;

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
            {t.urgentWarning}
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
        dangerouslySetInnerHTML={{ __html: t.reminderMessage }}
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
        dangerouslySetInnerHTML={{ __html: t.actionRequired }}
      />

      <Section style={{ textAlign: 'center', margin: '32px 0' }}>
        <EmailButton href={hostedVoucherUrl} variant={isUrgent ? 'danger' : 'primary'} size="lg">
          {isUrgent ? t.payNowUrgent : t.completePayment}
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
          <strong>{t.warningTitle}</strong>
          <br />
          {t.warningText}
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
        {t.support}
      </Text>
    </EmailLayout>
  );
}
