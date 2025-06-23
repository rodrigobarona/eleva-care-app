import { BaseEmailTemplate } from './components/BaseEmailTemplate';
import { EmailFooter } from './components/EmailFooter';
import { EmailHeader } from './components/EmailHeader';
// Internal imports for use in utility functions
import { emailDesignTokens } from './design-tokens';
import { emailTemplateEngine } from './engine/EmailTemplateEngine';

/**
 * Email Template Infrastructure - Eleva Care
 *
 * Comprehensive email template system based on Cal.com patterns
 * with healthcare-specific enhancements and WCAG 2.1 AA compliance
 */

// Core types and interfaces
export * from './types';

// Design system
export {
  emailDesignTokens,
  darkModeTokens,
  highContrastTokens,
  rtlAdjustments,
  clientOverrides,
  a11yUtilities,
  getContrastCompliantColor,
  getTypographyScale,
  getSpacing,
} from './design-tokens';

// Base components
export { BaseEmailTemplate } from './components/BaseEmailTemplate';
export { EmailHeader } from './components/EmailHeader';
export { EmailFooter } from './components/EmailFooter';

// Email template engine
export { EmailTemplateEngine, emailTemplateEngine } from './engine/EmailTemplateEngine';

// Re-export commonly used React Email components for convenience
export {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';

// Utility functions
export const createEmailRenderOptions = (
  locale: import('./types').SupportedLocale = 'en',
  userRole: import('./types').UserRole = 'patient',
  overrides?: Partial<import('./types').EmailRenderOptions>,
): import('./types').EmailRenderOptions => ({
  locale,
  userRole,
  timezone: 'UTC',
  currency: 'EUR',
  rtl: false, // No RTL languages supported currently
  darkMode: false,
  highContrast: false,
  previewMode: false,
  ...overrides,
});

export const createTemplateSelector = (
  workflowId: string,
  eventType: string,
  userSegment: import('./types').UserRole = 'patient',
  locale: import('./types').SupportedLocale = 'en',
  templateVariant: 'default' | 'urgent' | 'reminder' | 'follow-up' = 'default',
): import('./types').TemplateSelector => ({
  workflowId,
  eventType,
  userSegment,
  locale,
  templateVariant,
});

// Template validation utility
export const validateEmailData = (
  templateId: string,
  data: Record<string, unknown>,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Basic validation rules
  if (!data.subject || typeof data.subject !== 'string') {
    errors.push('Subject is required and must be a string');
  }

  if (data.subject && (data.subject as string).length > 100) {
    errors.push('Subject must be 100 characters or less');
  }

  // Template-specific validations
  if (templateId.includes('appointment')) {
    if (!data.expertName) errors.push('expertName is required for appointment templates');
    if (!data.clientName) errors.push('clientName is required for appointment templates');
    if (!data.appointmentDate) errors.push('appointmentDate is required for appointment templates');
    if (!data.appointmentTime) errors.push('appointmentTime is required for appointment templates');
  }

  if (templateId.includes('payment')) {
    if (!data.amount) errors.push('amount is required for payment templates');
    if (!data.customerName) errors.push('customerName is required for payment templates');
  }

  if (templateId.includes('user') || templateId.includes('expert')) {
    if (!data.userName && !data.expertName) {
      errors.push('userName or expertName is required for user templates');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Email analytics helper
export const createEmailAnalytics = (
  templateId: string,
  initialMetrics?: Partial<import('./types').EmailAnalytics>,
): import('./types').EmailAnalytics => ({
  templateId,
  sentAt: new Date(),
  metrics: {
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    unsubscribed: 0,
    bounced: 0,
    marked_spam: 0,
    ...initialMetrics?.metrics,
  },
  performance: {
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    unsubscribeRate: 0,
    bounceRate: 0,
    ...initialMetrics?.performance,
  },
  engagement: {
    avgTimeToOpen: 0,
    avgTimeOnEmail: 0,
    clickHeatmap: [],
    ...initialMetrics?.engagement,
  },
});

// Template configuration builder
export const createTemplateConfig = (
  workflowId: string,
  eventTypeMapping: Record<string, string>,
  overrides?: Partial<import('./types').TemplateConfig>,
): import('./types').TemplateConfig => ({
  workflowId,
  eventTypeMapping,
  templateVariants: ['default'],
  personalizationRules: [],
  deliveryOptions: {
    provider: 'resend',
    from: process.env.RESEND_EMAIL_FROM || 'notifications@eleva.care',
    priority: 'normal',
    retryPolicy: {
      maxAttempts: 3,
      backoffMultiplier: 2,
    },
  },
  multiChannel: {
    email: true,
    inApp: false,
    push: false,
    sms: false,
  },
  fallbackTemplate: 'generic-notification',
  ...overrides,
});

// Accessibility helper functions
export const getAccessibilityScore = (html: string): number => {
  let score = 100;

  // Check for alt text on images
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const imgWithAlt = html.match(/<img[^>]*alt=["'][^"']*["'][^>]*>/gi) || [];
  if (imgTags.length > 0 && imgWithAlt.length < imgTags.length) {
    score -= 20;
  }

  // Check for semantic headings
  if (!html.includes('<h1') && !html.includes('<h2')) {
    score -= 15;
  }

  // Check for lang attribute
  if (!html.includes('lang=')) {
    score -= 10;
  }

  // Check for sufficient color contrast (basic check)
  if (html.includes('color: #') && !html.includes('background-color:')) {
    score -= 10;
  }

  // Check for skip links
  if (!html.includes('skip') && !html.includes('Skip')) {
    score -= 5;
  }

  return Math.max(0, score);
};

export const getEmailSize = (html: string): number => {
  return Buffer.byteLength(html, 'utf8');
};

export const isEmailSizeOptimal = (html: string): boolean => {
  return getEmailSize(html) <= 102400; // 100KB
};

// Development and testing utilities
export const previewEmail = async (
  templateId: string,
  data: Record<string, unknown>,
  options?: import('./types').EmailRenderOptions,
): Promise<{ html: string; text: string; subject: string }> => {
  const renderOptions = options || createEmailRenderOptions();
  renderOptions.previewMode = true;

  return emailTemplateEngine.renderTemplate(templateId, data, renderOptions);
};

// Export default configuration
export const defaultEmailConfig = {
  designTokens: emailDesignTokens,
  supportedLocales: ['en', 'es', 'pt', 'br'] as import('./types').SupportedLocale[],
  defaultLocale: 'en' as import('./types').SupportedLocale,
  defaultUserRole: 'patient' as import('./types').UserRole,
  maxEmailSize: 102400, // 100KB
  maxRenderTime: 1000, // 1 second
  wcagLevel: 'AA' as const,
  fallbackTemplate: 'generic-notification',
  analytics: {
    trackOpens: true,
    trackClicks: true,
    retentionDays: 90,
  },
};

// Version info
export const VERSION = '1.0.0';
// Build date should be injected at build time, not runtime
export const BUILD_DATE = process.env.BUILD_DATE || 'development';

// Export everything as default for convenience
const emailTemplateInfrastructure = {
  emailTemplateEngine,
  emailDesignTokens,
  BaseEmailTemplate,
  EmailHeader,
  EmailFooter,
  createEmailRenderOptions,
  createTemplateSelector,
  validateEmailData,
  createEmailAnalytics,
  createTemplateConfig,
  getAccessibilityScore,
  getEmailSize,
  isEmailSizeOptimal,
  previewEmail,
  defaultEmailConfig,
  VERSION,
  BUILD_DATE,
};

export default emailTemplateInfrastructure;
