import * as React from 'react';
import { EmailLayout } from '@/components/emails';
import {
  createTableCellStyle,
  ELEVA_CARD_STYLES,
  ELEVA_COLORS,
  ELEVA_TEXT_STYLES,
  ELEVA_TYPOGRAPHY,
} from '@/emails/utils/brand-constants';
import type { SupportedLocale } from '@/emails/utils/i18n';
import { Heading, Section, Text } from '@react-email/components';

interface SystemHealthAlertEmailProps {
  /** Numeric percentage 0-100; rendered as part of the memory row. */
  memoryPercentage?: number;
  memoryUsed?: number;
  memoryTotal?: number;
  status?: 'healthy' | 'unhealthy';
  environment?: string;
  error?: string;
  timestamp?: string;
  /**
   * Operational template — admin-facing only, English by default. Locale
   * support is intentionally minimal because alerts go to a fixed
   * internal subscriber (NOVU_ADMIN_SUBSCRIBER_ID).
   */
  locale?: SupportedLocale;
}

/**
 * Branded React Email template for the `system-health` Novu workflow.
 * Replaces the inline HTML body that previously shipped from
 * `config/novu.ts` (no branding, no structured rows). Used by the
 * `/api/healthcheck` endpoint and the Redis webhook monitor.
 */
export const SystemHealthAlertEmail = ({
  memoryPercentage,
  memoryUsed,
  memoryTotal,
  status = 'unhealthy',
  environment = 'unknown',
  error,
  timestamp,
  locale = 'en',
}: SystemHealthAlertEmailProps) => {
  const isUnhealthy = status === 'unhealthy';
  const subject = `${isUnhealthy ? '⚠️' : '✅'} System Health: ${status} (${environment})`;
  const previewText = error
    ? `${status} in ${environment}: ${error.length > 100 ? `${error.substring(0, 100)}...` : error}`
    : `${status} in ${environment}`;

  return (
    <EmailLayout
      subject={subject}
      previewText={previewText}
      headerVariant="branded"
      footerVariant="default"
      locale={locale}
    >
      <Section style={isUnhealthy ? ELEVA_CARD_STYLES.warning : ELEVA_CARD_STYLES.success}>
        <Heading
          style={{
            ...ELEVA_TEXT_STYLES.heading2,
            margin: '0 0 8px 0',
            textAlign: 'center' as const,
            color: isUnhealthy ? ELEVA_COLORS.error : ELEVA_COLORS.success,
          }}
        >
          {isUnhealthy ? '⚠️' : '✅'} System {status}
        </Heading>
        <Text
          style={{
            ...ELEVA_TEXT_STYLES.bodyRegular,
            margin: '0',
            textAlign: 'center' as const,
            fontWeight: ELEVA_TYPOGRAPHY.weights.medium,
          }}
        >
          Environment: <strong>{environment}</strong>
        </Text>
      </Section>

      <Section style={{ margin: '24px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
          <tbody>
            {timestamp && (
              <tr>
                <td style={createTableCellStyle(true)}>Timestamp:</td>
                <td style={createTableCellStyle(false, 'right')}>{timestamp}</td>
              </tr>
            )}
            {typeof memoryPercentage === 'number' && (
              <tr>
                <td style={createTableCellStyle(true)}>Memory:</td>
                <td style={createTableCellStyle(false, 'right')}>
                  {memoryPercentage.toFixed(1)}%
                  {typeof memoryUsed === 'number' && typeof memoryTotal === 'number' && (
                    <> ({memoryUsed} / {memoryTotal})</>
                  )}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td style={createTableCellStyle(true)}>Error:</td>
                <td
                  style={{
                    ...createTableCellStyle(false, 'right'),
                    fontFamily: 'monospace',
                    color: ELEVA_COLORS.error,
                  }}
                >
                  {error}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section style={{ margin: '24px 0' }}>
        <Text style={ELEVA_TEXT_STYLES.bodyRegular}>
          Please investigate and confirm the root cause. This alert was sent automatically.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default SystemHealthAlertEmail;

SystemHealthAlertEmail.PreviewProps = {
  status: 'unhealthy',
  environment: 'production',
  error: 'Redis connection timeout after 5000ms',
  timestamp: '2026-04-20T08:30:00.000Z',
  memoryPercentage: 87.4,
  memoryUsed: 2800,
  memoryTotal: 3200,
  locale: 'en',
} as SystemHealthAlertEmailProps;
