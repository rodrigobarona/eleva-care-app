// Mock for next-intl/server to prevent ESM parsing issues in Jest

export const getTranslations = jest.fn(() => (key: string) => key);
export const getLocale = jest.fn(() => 'en');
export const getMessages = jest.fn(() => ({}));
export const getNow = jest.fn(() => new Date());
export const getRequestConfig = jest.fn(() => ({}));
export const getTimeZone = jest.fn(() => 'UTC');
export const setRequestLocale = jest.fn();

// Default export for compatibility
const mockNextIntlServer = {
  getTranslations,
  getLocale,
  getMessages,
  getNow,
  getRequestConfig,
  getTimeZone,
  setRequestLocale,
};

export default mockNextIntlServer;
