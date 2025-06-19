'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';

/**
 * Dynamic i18n Messages Loader
 *
 * This component dynamically loads translation messages based on the current locale,
 * reducing the initial bundle size by not loading all translations upfront.
 */

type Messages = Record<string, unknown>;

const messagesCache: Record<string, Messages> = {};

/**
 * Dynamically loads translation messages for a specific locale
 * @param locale - The locale to load messages for
 * @returns Promise resolving to the messages object
 */
async function loadMessages(locale: string): Promise<Messages> {
  if (messagesCache[locale]) {
    return messagesCache[locale];
  }

  try {
    const messages = await import(`../../../messages/${locale}.json`);
    messagesCache[locale] = messages.default;
    return messages.default;
  } catch (error) {
    console.warn(`Failed to load messages for locale: ${locale}`, error);
    // Fallback to English if locale not found
    if (locale !== 'en') {
      return loadMessages('en');
    }
    return {};
  }
}

interface DynamicMessagesProps {
  children: (messages: Messages | null, loading: boolean) => React.ReactNode;
}

/**
 * Dynamic Messages Provider Component
 *
 * Provides translation messages that are loaded dynamically based on the current locale.
 * This reduces the initial bundle size by only loading the needed locale.
 */
export function DynamicMessages({ children }: DynamicMessagesProps) {
  const locale = useLocale();
  const [messages, setMessages] = useState<Messages | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadMessages(locale)
      .then((loadedMessages) => {
        setMessages(loadedMessages);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load messages:', error);
        setMessages({});
        setLoading(false);
      });
  }, [locale]);

  return <>{children(messages, loading)}</>;
}

/**
 * Hook for using dynamic messages
 * @param section - Optional section of messages to load
 * @returns Object with messages, loading state, and locale
 */
export function useDynamicMessages(section?: string) {
  const locale = useLocale();
  const [messages, setMessages] = useState<Messages | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadMessages(locale)
      .then((loadedMessages) => {
        const sectionMessages = section
          ? (loadedMessages[section] as Messages) || {}
          : loadedMessages;
        setMessages(sectionMessages);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load messages:', error);
        setMessages({});
        setLoading(false);
      });
  }, [locale, section]);

  return { messages, loading, locale };
}
