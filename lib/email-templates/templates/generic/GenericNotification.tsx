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
 */
export const GenericNotification: React.FC<GenericNotificationProps> = ({
  title = 'Notification',
  message = 'You have a new notification from Eleva.care',
  userName,
  locale = 'en',
}) => {
  const greeting = userName ? `Hello ${userName},` : 'Hello,';

  return (
    <>
      <Heading className="mb-4 text-xl font-bold text-gray-800">{title}</Heading>

      <Text className="mb-4 text-base text-gray-700">{greeting}</Text>

      <Text className="mb-4 text-base text-gray-700">{message}</Text>

      <Text className="text-base text-gray-700">
        {locale === 'pt'
          ? 'Obrigado por usar a Eleva.care!'
          : locale === 'es'
            ? '¡Gracias por usar Eleva.care!'
            : locale === 'fr'
              ? "Merci d'utiliser Eleva.care!"
              : locale === 'de'
                ? 'Vielen Dank für die Nutzung von Eleva.care!'
                : locale === 'ar'
                  ? 'شكراً لاستخدام Eleva.care!'
                  : locale === 'he'
                    ? 'תודה שאתם משתמשים ב-Eleva.care!'
                    : 'Thank you for using Eleva.care!'}
      </Text>

      <Text className="mt-6 text-sm text-gray-500">
        {locale === 'pt'
          ? 'Equipe Eleva.care'
          : locale === 'es'
            ? 'Equipo Eleva.care'
            : locale === 'fr'
              ? 'Équipe Eleva.care'
              : locale === 'de'
                ? 'Eleva.care Team'
                : locale === 'ar'
                  ? 'فريق Eleva.care'
                  : locale === 'he'
                    ? 'צוות Eleva.care'
                    : 'The Eleva.care Team'}
      </Text>
    </>
  );
};

export default GenericNotification;
