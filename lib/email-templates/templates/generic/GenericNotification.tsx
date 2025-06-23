import { emailDesignTokens, getTypographyScale } from '@/lib/email-templates/design-tokens';
import type { SupportedLocale } from '@/lib/email-templates/types';
import { normalizeLocale, translateEmail } from '@/lib/email-templates/utils/translations';
import { Heading, Text } from '@react-email/components';
import React from 'react';

interface GenericNotificationProps {
  title?: string;
  message?: string;
  userName?: string;
  locale?: string;
}

/**
 * Generic Notification Template
 * Fallback template for when specific templates are not available
 * Fully integrated with design tokens and translation system
 *
 * @example
 * // Basic usage
 * <GenericNotification title="Welcome" message="Hello!" locale="es" />
 *
 * @example
 * // With user personalization
 * <GenericNotification
 *   title="Account Update"
 *   message="Your profile has been updated"
 *   userName="Maria"
 *   locale="pt"
 * />
 */
export const GenericNotification: React.FC<GenericNotificationProps> = async ({
  title = 'Notification',
  message = 'You have a new notification from Eleva.care',
  userName,
  locale = 'en',
}) => {
  // Normalize locale to supported format
  const normalizedLocale: SupportedLocale = normalizeLocale(locale);

  // Get translations using existing translation keys
  const thankYouText = await translateEmail(
    normalizedLocale,
    'notifications.appointmentConfirmation.thankYou',
    {},
  );
  const teamText = await translateEmail(
    normalizedLocale,
    'notifications.appointmentConfirmation.team',
    {},
  );

  // Create a simple greeting based on userName
  const greetingText = userName
    ? `Hi ${userName},` // Simple greeting - could be enhanced with locale-specific translations if needed
    : 'Hello,';

  return (
    <>
      <Heading
        style={{
          ...getTypographyScale('xl', 'heading'),
          color: emailDesignTokens.colors.neutral[800],
          marginBottom: emailDesignTokens.spacing.md,
          fontWeight: emailDesignTokens.typography.weights.bold,
        }}
      >
        {title}
      </Heading>

      <Text
        style={{
          ...getTypographyScale('base'),
          color: emailDesignTokens.colors.neutral[700],
          marginBottom: emailDesignTokens.spacing.md,
        }}
      >
        {greetingText}
      </Text>

      <Text
        style={{
          ...getTypographyScale('base'),
          color: emailDesignTokens.colors.neutral[700],
          marginBottom: emailDesignTokens.spacing.md,
        }}
      >
        {message}
      </Text>

      <Text
        style={{
          ...getTypographyScale('base'),
          color: emailDesignTokens.colors.neutral[700],
        }}
      >
        {thankYouText}
      </Text>

      <Text
        style={{
          ...getTypographyScale('sm'),
          color: emailDesignTokens.colors.neutral[500],
          marginTop: emailDesignTokens.spacing.lg,
        }}
      >
        {teamText}
      </Text>
    </>
  );
};

export default GenericNotification;
