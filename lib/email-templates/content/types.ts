// Type definitions for email content structure
export type LocalizedContent = {
  en: string;
  es: string;
  pt: string;
  'pt-BR': string;
};

export type EmailContentType = {
  subject: LocalizedContent;
  preheader: LocalizedContent;
  body: LocalizedContent;
};
