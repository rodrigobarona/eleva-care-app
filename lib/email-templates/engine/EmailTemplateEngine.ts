import { render } from '@react-email/render';
import React from 'react';

import { BaseEmailTemplate } from '../components/BaseEmailTemplate';
import type {
  EmailAnalytics,
  EmailRenderOptions,
  SupportedLocale,
  TemplateConfig,
  TemplateSelector,
  ValidationResult,
} from '../types';

/**
 * Safe expression evaluator that only supports whitelisted operations
 * Prevents code injection while supporting template condition evaluation
 */
function safeEvaluateExpression(expression: string, context: Record<string, unknown>): boolean {
  try {
    // Remove all whitespace to normalize the expression
    const normalized = expression.replace(/\s+/g, ' ').trim();

    // Whitelist of allowed operations and patterns
    // Order matters: longer operators first to avoid precedence issues (>= before >, !== before !=)
    const allowedOperators = ['===', '!==', '>=', '<=', '==', '!=', '>', '<', '&&', '||'];

    // Simple pattern matching for basic conditions
    // Support patterns like: variable === "value", variable > number, etc.

    // Handle simple equality/inequality checks
    for (const operator of allowedOperators) {
      const operatorIndex = findOperatorOutsideQuotes(normalized, operator);
      if (operatorIndex !== -1) {
        const left = normalized.substring(0, operatorIndex).trim();
        const right = normalized.substring(operatorIndex + operator.length).trim();

        if (left && right) {
          // Get left operand value
          const leftValue = getContextValue(left, context);
          // Get right operand value
          const rightValue = parseValue(right, context);

          // Safely perform comparison
          return performSafeComparison(leftValue, rightValue, operator);
        }
      }
    }

    // Handle boolean context values directly
    if (Object.prototype.hasOwnProperty.call(context, normalized)) {
      const value = context[normalized];
      return Boolean(value);
    }

    // If no pattern matches, return false for safety
    console.warn(`Unsupported expression pattern: ${expression}`);
    return false;
  } catch (error) {
    console.warn(`Failed to safely evaluate expression: ${expression}`, error);
    return false;
  }
}

/**
 * Find operator outside of quoted strings to avoid parsing operators within string literals
 */
function findOperatorOutsideQuotes(expression: string, operator: string): number {
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i <= expression.length - operator.length; i++) {
    const char = expression[i];

    // Track quote state
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    }

    // Check for operator only if not inside quotes
    if (!inSingleQuote && !inDoubleQuote) {
      if (expression.substring(i, i + operator.length) === operator) {
        return i;
      }
    }
  }

  return -1;
}

/**
 * Get value from context safely
 */
function getContextValue(key: string, context: Record<string, unknown>): unknown {
  // Remove quotes if present
  const cleanKey = key.replace(/['"]/g, '');
  return context[cleanKey];
}

/**
 * Parse a value from string, considering context variables
 */
function parseValue(value: string, context: Record<string, unknown>): unknown {
  const trimmed = value.trim();

  // Handle string literals
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  // Handle numbers
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  // Handle booleans
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Handle context variables
  if (Object.prototype.hasOwnProperty.call(context, trimmed)) {
    return context[trimmed];
  }

  // Default to string value
  return trimmed;
}

/**
 * Perform safe comparison between two values
 */
function performSafeComparison(left: unknown, right: unknown, operator: string): boolean {
  switch (operator) {
    case '===':
      return left === right;
    case '!==':
      return left !== right;
    case '==':
      return left == right;
    case '!=':
      return left != right;
    case '>':
      return Number(left) > Number(right);
    case '<':
      return Number(left) < Number(right);
    case '>=':
      return Number(left) >= Number(right);
    case '<=':
      return Number(left) <= Number(right);
    case '&&':
      return Boolean(left) && Boolean(right);
    case '||':
      return Boolean(left) || Boolean(right);
    default:
      console.warn(`Unsupported operator: ${operator}`);
      return false;
  }
}

/**
 * Email Template Engine
 * Central service for managing email template rendering, validation, and delivery
 * Implements Cal.com-inspired patterns with Eleva Care enhancements
 */
export class EmailTemplateEngine {
  private templateCache: Map<string, React.ComponentType<Record<string, unknown>>> = new Map();
  private validationCache: Map<string, ValidationResult> = new Map();
  private analytics: Map<string, EmailAnalytics> = new Map();
  private templateConfigs: Map<string, TemplateConfig> = new Map();

  constructor() {
    this.initializeTemplateConfigs();
  }

  /**
   * Initialize template configurations for different workflows
   */
  private initializeTemplateConfigs(): void {
    // Appointment workflow configuration
    this.templateConfigs.set('appointmentWorkflow', {
      workflowId: 'appointmentWorkflow',
      eventTypeMapping: {
        reminder: 'appointment-reminder',
        cancelled: 'appointment-cancelled',
        'new-booking-expert': 'new-booking-notification',
        confirmation: 'appointment-confirmation',
      },
      templateVariants: ['default', 'urgent', 'reminder'],
      personalizationRules: [
        {
          condition: 'userRole === "expert"',
          action: 'replace',
          target: 'subject',
          value: 'New appointment with {{clientName}}',
          priority: 1,
        },
        {
          condition: 'userRole === "patient"',
          action: 'replace',
          target: 'subject',
          value: 'Appointment confirmation with {{expertName}}',
          priority: 1,
        },
      ],
      deliveryOptions: {
        provider: 'resend',
        from: process.env.RESEND_EMAIL_BOOKINGS_FROM || 'appointments@eleva.care',
        priority: 'normal',
        retryPolicy: {
          maxAttempts: 3,
          backoffMultiplier: 2,
        },
      },
      multiChannel: {
        email: true,
        inApp: true,
        push: true,
        sms: false,
      },
      fallbackTemplate: 'generic-notification',
    });

    // User lifecycle workflow configuration
    this.templateConfigs.set('userLifecycleWorkflow', {
      workflowId: 'userLifecycleWorkflow',
      eventTypeMapping: {
        welcome: 'user-welcome',
        'user-created': 'user-created-notification',
        'account-activation': 'account-activation',
      },
      templateVariants: ['default', 'expert', 'patient'],
      personalizationRules: [
        {
          condition: 'userRole === "expert"',
          action: 'replace',
          target: 'template',
          value: 'expert-welcome',
          priority: 1,
        },
      ],
      deliveryOptions: {
        provider: 'resend',
        from: process.env.RESEND_EMAIL_FROM || 'welcome@eleva.care',
        priority: 'high',
        retryPolicy: {
          maxAttempts: 5,
          backoffMultiplier: 1.5,
        },
      },
      multiChannel: {
        email: true,
        inApp: true,
        push: false,
        sms: false,
      },
      fallbackTemplate: 'generic-notification',
    });

    // Payment workflow configuration
    this.templateConfigs.set('paymentWorkflow', {
      workflowId: 'paymentWorkflow',
      eventTypeMapping: {
        'payment-success': 'payment-confirmation',
        'payment-failed': 'payment-failed-notice',
        'stripe-payout': 'expert-payout-notification',
        'stripe-account-update': 'payment-method-update',
      },
      templateVariants: ['default', 'urgent', 'reminder'],
      personalizationRules: [
        {
          condition: 'amount > 100',
          action: 'show',
          target: 'highValueNotice',
          priority: 2,
        },
      ],
      deliveryOptions: {
        provider: 'resend',
        from: process.env.RESEND_EMAIL_FROM || 'payments@eleva.care',
        priority: 'high',
        retryPolicy: {
          maxAttempts: 3,
          backoffMultiplier: 2,
        },
      },
      multiChannel: {
        email: true,
        inApp: true,
        push: true,
        sms: true,
      },
      fallbackTemplate: 'generic-notification',
    });
  }

  /**
   * Select appropriate template based on criteria
   */
  public selectTemplate(selector: TemplateSelector): string {
    const config = this.templateConfigs.get(selector.workflowId);
    if (!config) {
      console.warn(`No configuration found for workflow: ${selector.workflowId}`);
      return 'generic-notification';
    }

    // Get base template from event type mapping
    const baseTemplate = config.eventTypeMapping[selector.eventType];
    if (!baseTemplate) {
      console.warn(`No template mapping found for event type: ${selector.eventType}`);
      return config.fallbackTemplate || 'generic-notification';
    }

    // Apply template variant
    if (selector.templateVariant && selector.templateVariant !== 'default') {
      return `${baseTemplate}-${selector.templateVariant}`;
    }

    // Apply user segment customization
    if (selector.userSegment && selector.userSegment !== 'patient') {
      return `${baseTemplate}-${selector.userSegment}`;
    }

    return baseTemplate;
  }

  /**
   * Render email template with options
   */
  public async renderTemplate(
    templateId: string,
    data: Record<string, unknown>,
    options: EmailRenderOptions,
  ): Promise<{ html: string; text: string; subject: string }> {
    try {
      // Get cached template component or load it
      let TemplateComponent = this.templateCache.get(templateId);

      if (!TemplateComponent) {
        TemplateComponent = await this.loadTemplate(templateId);
        this.templateCache.set(templateId, TemplateComponent);
      }

      // Apply personalization rules
      const personalizedData = this.applyPersonalization(templateId, data, options);

      // Create the React element with BaseEmailTemplate wrapper
      const baseTemplateProps = {
        subject: personalizedData.subject as string,
        preheader: personalizedData.preheader as string,
        renderOptions: options,
        children: React.createElement(TemplateComponent, personalizedData),
      };

      const emailElement = React.createElement(BaseEmailTemplate, baseTemplateProps);

      // Render to HTML
      const html = await render(emailElement, {
        pretty: false,
      });

      // Generate plain text version
      const text = this.generatePlainText(html);

      // Generate subject with personalization
      const subject = this.generateSubject(templateId, personalizedData, options);

      return { html, text, subject };
    } catch (error) {
      console.error(`Failed to render template ${templateId}:`, error);
      throw new Error(
        `Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Load template component dynamically
   */
  private async loadTemplate(
    templateId: string,
  ): Promise<React.ComponentType<Record<string, unknown>>> {
    try {
      // Map template IDs to component paths
      const templateMap: Record<string, string> = {
        'appointment-confirmation': '../templates/appointment/AppointmentConfirmation',
        'appointment-reminder': '../templates/appointment/AppointmentReminder',
        'appointment-cancelled': '../templates/appointment/AppointmentCancelled',
        'user-welcome': '../templates/user/UserWelcome',
        'expert-welcome': '../templates/expert/ExpertWelcome',
        'payment-confirmation': '../templates/payment/PaymentConfirmation',
        'payment-failed-notice': '../templates/payment/PaymentFailed',
        'generic-notification': '../templates/generic/GenericNotification',
      };

      const componentPath = templateMap[templateId];
      if (!componentPath) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Dynamic import of the template component
      const templateModule = await import(componentPath);
      return templateModule.default || templateModule[Object.keys(templateModule)[0]];
    } catch (error) {
      console.error(`Failed to load template ${templateId}:`, error);
      // Return fallback component
      const { default: GenericNotification } = await import(
        '../templates/generic/GenericNotification'
      );
      return GenericNotification;
    }
  }

  /**
   * Apply personalization rules to template data
   */
  private applyPersonalization(
    templateId: string,
    data: Record<string, unknown>,
    options: EmailRenderOptions,
  ): Record<string, unknown> {
    // Find workflow config that contains this template
    const workflowConfig = Array.from(this.templateConfigs.values()).find((config) =>
      Object.values(config.eventTypeMapping).some((mappedTemplate) =>
        templateId.startsWith(mappedTemplate),
      ),
    );

    if (!workflowConfig) {
      return data;
    }

    let personalizedData = { ...data };

    // Apply personalization rules in priority order
    const sortedRules = workflowConfig.personalizationRules.sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (this.evaluateCondition(rule.condition, personalizedData, options)) {
        personalizedData = this.applyPersonalizationAction(rule, personalizedData);
      }
    }

    // Add locale-specific data
    personalizedData.locale = options.locale;
    personalizedData.userRole = options.userRole;
    personalizedData.rtl = options.rtl;
    personalizedData.darkMode = options.darkMode;
    personalizedData.highContrast = options.highContrast;

    return personalizedData;
  }

  /**
   * Evaluate personalization condition using safe expression evaluator
   */
  private evaluateCondition(
    condition: string,
    data: Record<string, unknown>,
    options: EmailRenderOptions,
  ): boolean {
    try {
      // Create a safe evaluation context
      const context = {
        ...data,
        userRole: options.userRole,
        locale: options.locale,
        darkMode: options.darkMode,
        highContrast: options.highContrast,
      };

      // Use safe expression evaluator directly without string replacement
      // The evaluator will handle context variable resolution safely
      return safeEvaluateExpression(condition, context);
    } catch (error) {
      console.warn(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }

  /**
   * Apply personalization action
   */
  private applyPersonalizationAction(
    rule: import('../types').PersonalizationRule,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...data };

    switch (rule.action) {
      case 'replace':
        result[rule.target] = rule.value;
        break;
      case 'show':
        result[`show_${rule.target}`] = true;
        break;
      case 'hide':
        result[`show_${rule.target}`] = false;
        break;
      case 'modify':
        if (typeof result[rule.target] === 'string' && typeof rule.value === 'string') {
          result[rule.target] = (result[rule.target] as string) + rule.value;
        }
        break;
    }

    return result;
  }

  /**
   * Generate subject line with personalization
   */
  private generateSubject(
    templateId: string,
    data: Record<string, unknown>,
    options: EmailRenderOptions,
  ): string {
    // Default subjects by template type
    const defaultSubjects: Record<string, Record<SupportedLocale, string>> = {
      'appointment-confirmation': {
        en: 'Appointment Confirmed - {{date}} at {{time}}',
        es: 'Cita Confirmada - {{date}} a las {{time}}',
        pt: 'Consulta Confirmada - {{date}} às {{time}}',
        'pt-BR': 'Consulta Confirmada - {{date}} às {{time}}',
      },
      'payment-confirmation': {
        en: 'Payment Confirmed - €{{amount}}',
        es: 'Pago Confirmado - €{{amount}}',
        pt: 'Pagamento Confirmado - €{{amount}}',
        'pt-BR': 'Pagamento Confirmado - €{{amount}}',
      },
    };

    // Get base template ID (remove variants)
    const baseTemplateId = templateId.split('-').slice(0, 2).join('-');
    const subjectTemplate =
      defaultSubjects[baseTemplateId]?.[options.locale] ||
      defaultSubjects[baseTemplateId]?.['en'] ||
      'Notification from Eleva.care';

    // Replace template variables
    let subject = subjectTemplate;
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, String(value));
    });

    return subject;
  }

  /**
   * Generate plain text version from HTML
   */
  private generatePlainText(html: string): string {
    return html
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '$1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * Validate email template
   */
  public async validateTemplate(
    templateId: string,
    data: Record<string, unknown>,
  ): Promise<ValidationResult> {
    const cacheKey = `${templateId}-${JSON.stringify(data)}`;

    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const startTime = Date.now();
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      performance: {
        renderTime: 0,
        size: 0,
        loadTime: 0,
      },
      accessibility: {
        wcagLevel: 'AA',
        issues: [],
      },
    };

    try {
      // Test render
      const renderOptions: EmailRenderOptions = {
        locale: 'en',
        userRole: 'patient',
        previewMode: true,
      };

      const { html } = await this.renderTemplate(templateId, data, renderOptions);
      const renderTime = Date.now() - startTime;

      result.performance.renderTime = renderTime;
      result.performance.size = Buffer.byteLength(html, 'utf8');

      // Basic validation checks - HTML should contain BOTH DOCTYPE and html tag
      if (!html.includes('<!DOCTYPE html') || !html.includes('<html')) {
        result.errors.push({
          type: 'structure',
          message: 'Missing DOCTYPE or html tag',
          severity: 'error',
        });
        result.isValid = false;
      }

      // Size validation
      if (result.performance.size > 102400) {
        // 100KB limit
        result.errors.push({
          type: 'performance',
          message: 'Email size exceeds 100KB limit',
          severity: 'warning',
        });
      }

      // Render time validation
      if (renderTime > 1000) {
        // 1 second limit
        result.errors.push({
          type: 'performance',
          message: 'Template render time exceeds 1 second',
          severity: 'warning',
        });
      }

      // Accessibility validation
      if (!html.includes('alt=') && html.includes('<img')) {
        result.accessibility.issues.push({
          rule: 'WCAG 1.1.1',
          impact: 'critical',
          description: 'Images missing alt text',
        });
        result.accessibility.wcagLevel = 'fail';
      }

      if (!html.includes('lang=')) {
        result.accessibility.issues.push({
          rule: 'WCAG 3.1.1',
          impact: 'serious',
          description: 'Document missing language attribute',
        });
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push({
        type: 'structure',
        message: `Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    }

    this.validationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Record email analytics
   */
  public recordAnalytics(templateId: string, metrics: Partial<EmailAnalytics>): void {
    const existing = this.analytics.get(templateId);
    if (existing) {
      // Merge metrics
      existing.metrics = { ...existing.metrics, ...metrics.metrics };
      existing.performance = { ...existing.performance, ...metrics.performance };
      existing.engagement = { ...existing.engagement, ...metrics.engagement };
    } else {
      this.analytics.set(templateId, {
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
        },
        performance: {
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0,
          unsubscribeRate: 0,
          bounceRate: 0,
        },
        engagement: {
          avgTimeToOpen: 0,
          avgTimeOnEmail: 0,
          clickHeatmap: [],
        },
        ...metrics,
      } as EmailAnalytics);
    }
  }

  /**
   * Get analytics for template
   */
  public getAnalytics(templateId: string): EmailAnalytics | undefined {
    return this.analytics.get(templateId);
  }

  /**
   * Clear caches
   */
  public clearCaches(): void {
    this.templateCache.clear();
    this.validationCache.clear();
  }

  /**
   * Get template configuration
   */
  public getTemplateConfig(workflowId: string): TemplateConfig | undefined {
    return this.templateConfigs.get(workflowId);
  }

  /**
   * Update template configuration
   */
  public updateTemplateConfig(workflowId: string, config: Partial<TemplateConfig>): void {
    const existing = this.templateConfigs.get(workflowId);
    if (existing) {
      this.templateConfigs.set(workflowId, { ...existing, ...config });
    }
  }
}

// Export singleton instance
export const emailTemplateEngine = new EmailTemplateEngine();
export default emailTemplateEngine;
