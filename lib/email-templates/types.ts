// Email Template Infrastructure Types
// Based on Cal.com patterns with Eleva Care-specific enhancements

/**
 * Supported languages for internationalization
 * Matches the locales available in /messages folder
 */
export type SupportedLocale = 'en' | 'es' | 'pt' | 'pt-BR';

/**
 * User roles for template personalization
 */
export type UserRole = 'patient' | 'expert' | 'admin' | 'support';

/**
 * Email template categories
 */
export type TemplateCategory =
  | 'appointment'
  | 'user-management'
  | 'payment'
  | 'expert-management'
  | 'marketplace'
  | 'system'
  | 'security';

/**
 * Email component types for the component library
 */
export type EmailComponentType =
  | 'hero'
  | 'text'
  | 'button'
  | 'table'
  | 'divider'
  | 'card'
  | 'alert'
  | 'footer'
  | 'header'
  | 'appointment-card'
  | 'payment-summary'
  | 'expert-profile'
  | 'progress-indicator'
  | 'security-alert';

/**
 * Email component variants for styling
 */
export type EmailVariant = 'default' | 'minimal' | 'branded';

/**
 * Theme preference for email components
 */
export type EmailTheme = 'light' | 'dark' | 'auto';

/**
 * Accessibility properties for WCAG 2.1 AA compliance
 */
export interface A11yProps {
  altText?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  role?: string;
  tabIndex?: number;
  highContrast?: boolean;
  semanticLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Custom link configuration
 */
export interface CustomLink {
  label: string;
  url: string;
  ariaLabel?: string;
  openInNewTab?: boolean;
}

/**
 * User context for personalization
 */
export interface UserContext {
  displayName?: string;
  email?: string;
  role?: UserRole;
  preferences?: {
    language?: SupportedLocale;
    timezone?: string;
    theme?: EmailTheme;
  };
}

/**
 * User preferences for email handling
 */
export interface UserPreferences {
  unsubscribeUrl?: string;
  managePreferencesUrl?: string;
  language?: SupportedLocale;
  emailFrequency?: 'immediate' | 'daily' | 'weekly' | 'monthly';
}

/**
 * Regulatory and compliance information
 */
export interface RegulatoryInfo {
  showHIPAACompliance?: boolean;
  showGDPRCompliance?: boolean;
  showSOC2Compliance?: boolean;
  customComplianceText?: string;
}

/**
 * Email Header Component Props
 */
export interface EmailHeaderProps {
  variant?: EmailVariant;
  showLogo?: boolean;
  showNavigation?: boolean;
  userContext?: UserContext;
  theme?: EmailTheme;
  language?: SupportedLocale;
  customization?: {
    containerStyles?: Record<string, string>;
    logoStyles?: Record<string, string>;
    logoImageStyles?: Record<string, string>;
    userContextStyles?: Record<string, string>;
    navigationStyles?: Record<string, string>;
  };
  skipLinkTarget?: string;
}

/**
 * Social media link configuration
 */
export interface SocialLink {
  platform: string;
  url: string;
  label?: string;
  iconUrl?: string;
}

/**
 * Email Footer Component Props
 */
export interface EmailFooterProps {
  variant?: EmailVariant;
  showLogo?: boolean;
  showSocialLinks?: boolean;
  showUnsubscribe?: boolean;
  showContactInfo?: boolean;
  customLinks?: CustomLink[];
  language?: SupportedLocale;
  theme?: EmailTheme;
  userPreferences?: UserPreferences;
  regulatoryInfo?: RegulatoryInfo;
  companyName?: string;
  tagline?: string;
  supportEmail?: string;
  customization?: {
    containerStyles?: Record<string, string>;
    logoStyles?: Record<string, string>;
    copyrightStyles?: Record<string, string>;
    unsubscribeStyles?: Record<string, string>;
    socialLinks?: SocialLink[];
  };
}

/**
 * Email template metadata
 */
export interface EmailMetadata {
  templateId: string;
  version: string;
  category: TemplateCategory;
  lastModified: Date;
  author: string;
  wcagCompliant: boolean;
  supportedLocales: SupportedLocale[];
  testingStatus: 'draft' | 'testing' | 'approved' | 'deprecated';
}

/**
 * Component properties interface
 */
export interface ComponentProps {
  className?: string;
  style?: Record<string, string>;
  children?: React.ReactNode;
  [key: string]: unknown;
}

/**
 * Base email component interface
 */
export interface EmailComponent {
  type: EmailComponentType;
  props: ComponentProps;
  accessibility: A11yProps;
  responsive?: boolean;
  darkModeSupport?: boolean;
}

/**
 * Header component configuration
 */
export interface HeaderComponent extends EmailComponent {
  type: 'header';
  props: ComponentProps & {
    logoUrl?: string;
    logoAlt?: string;
    brandName: string;
    navigation?: Array<{
      label: string;
      url: string;
    }>;
    userContext?: {
      name: string;
      role: UserRole;
    };
  };
}

/**
 * Footer component configuration
 */
export interface FooterComponent extends EmailComponent {
  type: 'footer';
  props: ComponentProps & {
    companyName: string;
    year: number;
    unsubscribeUrl?: string;
    contactEmail?: string;
    socialLinks?: Array<{
      platform: string;
      url: string;
      iconUrl?: string;
    }>;
    legalLinks?: Array<{
      label: string;
      url: string;
    }>;
    address?: string;
  };
}

/**
 * Main email template structure
 */
export interface EmailTemplate {
  subject: string;
  preheader?: string;
  header: HeaderComponent;
  body: EmailComponent[];
  footer: FooterComponent;
  metadata: EmailMetadata;
  personalization?: PersonalizationConfig;
  analytics?: AnalyticsConfig;
}

/**
 * Personalization configuration
 */
export interface PersonalizationConfig {
  userSegment?: string;
  dynamicContent?: Record<string, unknown>;
  conditionalBlocks?: Array<{
    condition: string;
    component: EmailComponent;
  }>;
  abTestVariant?: string;
}

/**
 * Analytics tracking configuration
 */
export interface AnalyticsConfig {
  trackOpens?: boolean;
  trackClicks?: boolean;
  customEvents?: Array<{
    eventName: string;
    selector: string;
  }>;
  utmParameters?: {
    source: string;
    medium: string;
    campaign: string;
    term?: string;
    content?: string;
  };
}

/**
 * Email rendering options
 */
export interface EmailRenderOptions {
  locale: SupportedLocale;
  userRole: UserRole;
  timezone?: string;
  currency?: string;
  rtl?: boolean;
  darkMode?: boolean;
  highContrast?: boolean;
  previewMode?: boolean;
}

/**
 * Template selection criteria
 */
export interface TemplateSelector {
  workflowId: string;
  eventType: string;
  userSegment: UserRole;
  locale: SupportedLocale;
  templateVariant: 'default' | 'urgent' | 'reminder' | 'follow-up';
  abTestGroup?: string;
}

/**
 * Email delivery configuration
 */
export interface DeliveryConfig {
  provider: 'resend' | 'sendgrid' | 'mailgun';
  from: string;
  replyTo?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  sendAt?: Date;
  timezone?: string;
  retryPolicy?: {
    maxAttempts: number;
    backoffMultiplier: number;
  };
}

/**
 * Multi-channel notification configuration
 */
export interface MultiChannelConfig {
  email: boolean;
  inApp: boolean;
  push: boolean;
  sms: boolean;
  slack?: boolean;
  webhook?: boolean;
}

/**
 * Template configuration for different workflows
 */
export interface TemplateConfig {
  workflowId: string;
  eventTypeMapping: Record<string, string>;
  templateVariants: string[];
  personalizationRules: PersonalizationRule[];
  deliveryOptions: DeliveryConfig;
  multiChannel: MultiChannelConfig;
  fallbackTemplate?: string;
}

/**
 * Personalization rule definition
 */
export interface PersonalizationRule {
  condition: string;
  action: 'show' | 'hide' | 'replace' | 'modify';
  target: string;
  value?: unknown;
  priority: number;
}

/**
 * Email template validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    type: 'accessibility' | 'content' | 'structure' | 'performance';
    message: string;
    severity: 'error' | 'warning' | 'info';
    line?: number;
    element?: string;
  }>;
  performance: {
    renderTime: number;
    size: number;
    loadTime: number;
  };
  accessibility: {
    wcagLevel: 'A' | 'AA' | 'AAA' | 'fail';
    issues: Array<{
      rule: string;
      impact: 'critical' | 'serious' | 'moderate' | 'minor';
      description: string;
    }>;
  };
}

/**
 * Email template testing configuration
 */
export interface TestingConfig {
  abTest?: {
    enabled: boolean;
    variants: string[];
    trafficSplit: number[];
    duration: number;
    metrics: string[];
  };
  clientTesting?: {
    clients: Array<'outlook' | 'gmail' | 'apple-mail' | 'thunderbird'>;
    devices: Array<'desktop' | 'mobile' | 'tablet'>;
    darkMode: boolean;
  };
  performance?: {
    maxRenderTime: number;
    maxSize: number;
    maxLoadTime: number;
  };
}

/**
 * Email campaign analytics data
 */
export interface EmailAnalytics {
  templateId: string;
  sentAt: Date;
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    bounced: number;
    marked_spam: number;
  };
  performance: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    unsubscribeRate: number;
    bounceRate: number;
  };
  engagement: {
    avgTimeToOpen: number;
    avgTimeOnEmail: number;
    clickHeatmap: Array<{
      element: string;
      clicks: number;
      percentage: number;
    }>;
  };
}

/**
 * Design token configuration
 */
export interface DesignTokens {
  colors: {
    primary: Record<string, string>;
    neutral: Record<string, string>;
    semantic: Record<string, string>;
    brand: Record<string, string>;
  };
  typography: {
    families: Record<string, string>;
    sizes: Record<string, string>;
    weights: Record<string, number>;
    lineHeights: Record<string, number>;
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  breakpoints: Record<string, string>;
}
