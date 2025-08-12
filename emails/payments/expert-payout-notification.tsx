import * as React from 'react';
import { EmailButton, EmailLayout } from '@/components/emails';
import { Heading, Hr, Section, Text } from '@react-email/components';

interface ExpertPayoutNotificationProps {
  expertName?: string;
  payoutAmount?: string;
  currency?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  clientName?: string;
  serviceName?: string;
  payoutId?: string;
  expectedArrivalDate?: string;
  bankLastFour?: string;
  dashboardUrl?: string;
  supportUrl?: string;
}

export const ExpertPayoutNotificationEmail = ({
  expertName = 'Dr. Maria Santos',
  payoutAmount = '52.50',
  currency = 'EUR',
  appointmentDate = 'Monday, February 19, 2024',
  appointmentTime = '2:30 PM - 3:30 PM',
  clientName = 'João Silva',
  serviceName = 'Mental Health Consultation',
  payoutId = 'po_1ABCDEF2ghijklmn',
  expectedArrivalDate = 'February 21, 2024',
  bankLastFour = '••••4242',
  dashboardUrl = 'https://eleva.care/dashboard/earnings',
  supportUrl = 'https://eleva.care/support',
}: ExpertPayoutNotificationProps) => {
  const subject = `💰 Payout sent: ${currency} ${payoutAmount} for your appointment with ${clientName}`;
  const previewText = `Your earnings from the appointment on ${appointmentDate} have been sent to your bank account. Expected arrival: ${expectedArrivalDate}.`;

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
          margin: '24px 0',
          textAlign: 'center' as const,
        }}
      >
        <Heading
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 0 8px 0',
            color: '#155724',
          }}
        >
          💰 Payout Sent Successfully!
        </Heading>
        <Text
          style={{
            fontSize: '16px',
            color: '#155724',
            margin: '0',
          }}
        >
          Your earnings have been sent to your bank account
        </Text>
      </Section>

      {/* Personal Greeting */}
      <Section style={{ margin: '32px 0' }}>
        <Heading
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 16px 0',
            color: '#1a1a1a',
          }}
        >
          Hello {expertName}! 👋
        </Heading>
        <Text
          style={{
            fontSize: '18px',
            lineHeight: '1.6',
            color: '#4a4a4a',
            margin: '0 0 16px 0',
          }}
        >
          Great news! Your earnings from the consultation with <strong>{clientName}</strong> have
          been processed and sent to your bank account.
        </Text>
      </Section>

      {/* Payout Summary */}
      <Section
        style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          padding: '24px',
          borderRadius: '12px',
          margin: '24px 0',
        }}
      >
        <Heading
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            margin: '0 0 20px 0',
            color: '#1a1a1a',
          }}
        >
          💰 Payout Details
        </Heading>

        <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
          <tr>
            <td style={{ padding: '8px 0', fontSize: '16px', color: '#6c757d' }}>Payout Amount:</td>
            <td
              style={{
                padding: '8px 0',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#28a745',
                textAlign: 'right' as const,
              }}
            >
              {currency} {payoutAmount}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '8px 0', fontSize: '16px', color: '#6c757d' }}>Service:</td>
            <td
              style={{
                padding: '8px 0',
                fontSize: '16px',
                color: '#1a1a1a',
                textAlign: 'right' as const,
              }}
            >
              {serviceName}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '8px 0', fontSize: '16px', color: '#6c757d' }}>
              Appointment Date:
            </td>
            <td
              style={{
                padding: '8px 0',
                fontSize: '16px',
                color: '#1a1a1a',
                textAlign: 'right' as const,
              }}
            >
              {appointmentDate}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '8px 0', fontSize: '16px', color: '#6c757d' }}>
              Appointment Time:
            </td>
            <td
              style={{
                padding: '8px 0',
                fontSize: '16px',
                color: '#1a1a1a',
                textAlign: 'right' as const,
              }}
            >
              {appointmentTime}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '8px 0', fontSize: '16px', color: '#6c757d' }}>Client:</td>
            <td
              style={{
                padding: '8px 0',
                fontSize: '16px',
                color: '#1a1a1a',
                textAlign: 'right' as const,
              }}
            >
              {clientName}
            </td>
          </tr>
        </table>
      </Section>

      {/* Bank Transfer Details */}
      <Section
        style={{
          backgroundColor: '#e3f2fd',
          border: '1px solid #90caf9',
          padding: '24px',
          borderRadius: '12px',
          margin: '24px 0',
        }}
      >
        <Heading
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            margin: '0 0 20px 0',
            color: '#1565c0',
          }}
        >
          🏦 Bank Transfer Information
        </Heading>

        <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
          <tr>
            <td style={{ padding: '8px 0', fontSize: '16px', color: '#1565c0' }}>
              Destination Account:
            </td>
            <td
              style={{
                padding: '8px 0',
                fontSize: '16px',
                color: '#1a1a1a',
                textAlign: 'right' as const,
              }}
            >
              {bankLastFour}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '8px 0', fontSize: '16px', color: '#1565c0' }}>
              Expected Arrival:
            </td>
            <td
              style={{
                padding: '8px 0',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1a1a1a',
                textAlign: 'right' as const,
              }}
            >
              {expectedArrivalDate}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '8px 0', fontSize: '16px', color: '#1565c0' }}>Payout ID:</td>
            <td
              style={{
                padding: '8px 0',
                fontSize: '14px',
                color: '#6c757d',
                textAlign: 'right' as const,
              }}
            >
              {payoutId}
            </td>
          </tr>
        </table>

        <Text
          style={{
            fontSize: '14px',
            color: '#1565c0',
            margin: '16px 0 0 0',
            fontStyle: 'italic',
          }}
        >
          💡 <strong>Note:</strong> Bank processing times may vary. Most transfers arrive within 1-2
          business days.
        </Text>
      </Section>

      <Hr style={{ margin: '32px 0', borderColor: '#e9ecef' }} />

      {/* Action Buttons */}
      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <EmailButton
          href={dashboardUrl}
          style={{
            backgroundColor: '#007bff',
            color: '#ffffff',
            padding: '16px 32px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'inline-block',
            margin: '0 8px 16px 8px',
          }}
        >
          📊 View Earnings Dashboard
        </EmailButton>

        <EmailButton
          href={supportUrl}
          style={{
            backgroundColor: '#6c757d',
            color: '#ffffff',
            padding: '16px 32px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'inline-block',
            margin: '0 8px 16px 8px',
          }}
        >
          💬 Contact Support
        </EmailButton>
      </Section>

      {/* Next Steps */}
      <Section style={{ margin: '32px 0' }}>
        <Heading
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            margin: '0 0 16px 0',
            color: '#1a1a1a',
          }}
        >
          🎯 What&apos;s Next?
        </Heading>

        <Text
          style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#4a4a4a',
            margin: '0 0 12px 0',
          }}
        >
          • <strong>Track your transfer:</strong> The funds should appear in your bank account by{' '}
          {expectedArrivalDate}
        </Text>

        <Text
          style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#4a4a4a',
            margin: '0 0 12px 0',
          }}
        >
          • <strong>View earnings history:</strong> Check your dashboard for detailed earnings
          reports
        </Text>

        <Text
          style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#4a4a4a',
            margin: '0 0 12px 0',
          }}
        >
          • <strong>Questions?</strong> Our support team is here to help with any payout inquiries
        </Text>
      </Section>

      {/* Appreciation Message */}
      <Section
        style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          padding: '24px',
          borderRadius: '12px',
          margin: '32px 0',
          textAlign: 'center' as const,
        }}
      >
        <Text
          style={{
            fontSize: '18px',
            lineHeight: '1.6',
            color: '#856404',
            margin: '0',
            fontWeight: 'bold',
          }}
        >
          🙏 Thank you for providing excellent care through Eleva!
        </Text>
        <Text
          style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: '#856404',
            margin: '8px 0 0 0',
          }}
        >
          Your dedication to helping patients makes a real difference.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default ExpertPayoutNotificationEmail;
