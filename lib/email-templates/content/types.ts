// Type definitions for email content structure
export type LocalizedContent = {
  en: string;
  es: string;
  pt: string;
  br: string;
};

export type EmailContentType = {
  subject: LocalizedContent;
  preheader: LocalizedContent;
  body: LocalizedContent;
};
