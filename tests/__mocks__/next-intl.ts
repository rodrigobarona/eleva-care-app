// Mock for next-intl to prevent ESM parsing issues in Jest

export const useTranslations = jest.fn(() => (key: string) => key);
export const useLocale = jest.fn(() => 'en');
export const useMessages = jest.fn(() => ({}));
export const useNow = jest.fn(() => new Date());
export const useTimeZone = jest.fn(() => 'UTC');

// Default export for compatibility
const mockNextIntl = {
  useTranslations,
  useLocale,
  useMessages,
  useNow,
  useTimeZone,
};

export default mockNextIntl;
