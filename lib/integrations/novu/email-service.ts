// Email templates are now imported through the email service functions
// Import email templates
import * as Sentry from '@sentry/nextjs';
import { ENV_CONFIG } from '@/config/env';
import AppointmentConfirmationTemplate from '@/emails/appointments/appointment-confirmation';
import { AppointmentReminderEmail } from '@/emails/appointments/appointment-reminder';
import ExpertNewAppointmentTemplate from '@/emails/experts/expert-new-appointment';
import { ExpertNotificationEmail } from '@/emails/experts/expert-notification';
import { ExpertPayoutNotificationTemplate, RefundNotificationTemplate } from '@/emails/payments';
import MultibancoBookingPendingTemplate from '@/emails/payments/multibanco-booking-pending';
import MultibancoPaymentReminderTemplate from '@/emails/payments/multibanco-payment-reminder';
import PaymentConfirmationTemplate from '@/emails/payments/payment-confirmation';
import ReservationExpiredEmail from '@/emails/payments/reservation-expired';
import WelcomeEmailTemplate from '@/emails/users/welcome-email';
import type { SupportedLocale } from '@/emails/utils/i18n';
import { generateAppointmentEmail, sendEmail } from '@/lib/integrations/novu/email';
import { Novu } from '@novu/api';
import { render } from '@react-email/render';
import React from 'react';

/**
 * Per-method opt-in flag for the dynamic template selection path
 * (`renderEmailWithSelection`). Default OFF — every render method uses its
 * manually-mapped fallback. Flip on by setting the env var
 * `NOVU_ENABLE_DYNAMIC_TEMPLATE_SELECTION=true`.
 *
 * The flag is enforced inside `renderEmailWithSelection` itself (see
 * implementation), which throws a descriptive error if invoked while the flag
 * is off. That makes the safety guarantee a runtime fact, not just a
 * convention — the production placeholder-leak bug ("João Silva / Consulta de
 * Cardiologia" leaking into Matilde Henriques' confirmation email) cannot
 * come back via a careless re-enable of the selection layer.
 */
export const ENABLE_DYNAMIC_TEMPLATE_SELECTION =
  process.env.NOVU_ENABLE_DYNAMIC_TEMPLATE_SELECTION === 'true';

/**
 * Centralized cast for the `templateMappings` and `propAdapters` tables.
 *
 * React Email components have strongly-typed prop interfaces, but the dynamic
 * selection layer needs to store them in a uniform map keyed by string. This
 * helper makes that intentional widening explicit (and greppable) in one
 * place instead of repeating `as unknown as React.ComponentType<...>` ~15
 * times. The matching prop adapter (see `propAdapters` below) is the only
 * thing that re-narrows the bag of `unknown` values into the template's real
 * prop shape.
 *
 * @example
 * ```ts
 * default: asTemplate(ExpertNewAppointmentTemplate),
 * ```
 */
type AnyTemplate = React.ComponentType<Record<string, unknown>>;
const asTemplate = <T extends React.ComponentType<Record<string, unknown>> | React.FC<unknown>>(
  template: T,
): AnyTemplate => template as unknown as AnyTemplate;

// Re-export SupportedLocale for use in other modules
export type { SupportedLocale };

/**
 * ELEVA-31: Novu Workflow Integration & Email Template Mapping (COMPLETED)
 *
 * This service provides advanced email workflow management with:
 * ✅ Dynamic template selection based on user segment and template variants
 * ✅ A/B testing support with weighted experiments
 * ✅ Multi-channel coordination (email + in-app notifications)
 * ✅ Localization support for multiple languages
 * ✅ Enhanced Novu workflow integration
 * ✅ Backward compatibility with existing templates
 *
 * USAGE EXAMPLES:
 *
 * 1. Basic Enhanced Email (with user segment and variant):
 * ```typescript
 * await sendNovuEmailEnhanced({
 *   workflowId: 'appointment-confirmation',
 *   subscriberId: 'user-123',
 *   templateType: 'appointment-confirmation',
 *   templateData: { expertName: 'Dr. Smith', clientName: 'John' },
 *   userSegment: 'patient',      // NEW: patient|expert|admin
 *   templateVariant: 'urgent',   // NEW: default|urgent|reminder|minimal|branded
 *   locale: 'pt'                 // NEW: en|pt|es|pt-BR
 * });
 * ```
 *
 * 2. A/B Testing Email Templates:
 * ```typescript
 * const selector: TemplateSelector = {
 *   workflowId: 'appointment-reminder',
 *   eventType: 'reminder',
 *   userSegment: 'patient',
 *   locale: 'en',
 *   templateVariant: 'default'
 * };
 *
 * const { template, selectedVariant } = templateSelectionService.selectTemplateForExperiment(
 *   selector,
 *   {
 *     experimentId: 'reminder-style-test',
 *     userId: 'user-123',
 *     variants: [
 *       { id: 'minimal', weight: 50, templateVariant: 'minimal' },
 *       { id: 'branded', weight: 50, templateVariant: 'branded' }
 *     ]
 *   }
 * );
 * ```
 *
 * 3. Enhanced Email Rendering with Template Selection:
 * ```typescript
 * const emailService = new ElevaEmailService();
 *
 * const html = await emailService.renderAppointmentConfirmation({
 *   expertName: 'Dr. Smith',
 *   clientName: 'John Doe',
 *   appointmentDate: '2024-01-15',
 *   // Enhanced options (ELEVA-31):
 *   userSegment: 'expert',       // Different styling for experts
 *   templateVariant: 'urgent',   // Urgent variant with priority styling
 *   locale: 'pt'                 // Portuguese localization
 * });
 * ```
 *
 * 4. Dynamic Template Mapping Configuration:
 * The TemplateSelectionService automatically maps workflows to templates:
 * - 'appointment-universal' → AppointmentConfirmationTemplate
 * - 'payment-universal' → MultibancoBookingPendingTemplate
 * - 'user-lifecycle' → WelcomeEmailTemplate
 * - Supports fallbacks and intelligent template selection
 *
 * MIGRATION BENEFITS:
 * - Zero breaking changes: All existing code continues to work
 * - Gradual adoption: Add userSegment/templateVariant only where needed
 * - Enhanced personalization: Different templates for patients vs experts
 * - A/B testing ready: Built-in experiment framework
 * - Scalable: Easy to add new templates and variants
 */

// Initialize Novu client with proper error handling
let novu: Novu | null = null;
let initializationError: string | null = null;

try {
  console.log('[Novu Email Service] Initializing client...');

  if (ENV_CONFIG.NOVU_SECRET_KEY) {
    novu = new Novu({
      secretKey: ENV_CONFIG.NOVU_SECRET_KEY,
      ...(ENV_CONFIG.NOVU_BASE_URL && { serverURL: ENV_CONFIG.NOVU_BASE_URL }),
    });
    console.log('[Novu Email Service] ✅ Client initialized successfully');
  } else if (ENV_CONFIG.NOVU_API_KEY) {
    novu = new Novu({
      secretKey: ENV_CONFIG.NOVU_API_KEY,
      ...(ENV_CONFIG.NOVU_BASE_URL && { serverURL: ENV_CONFIG.NOVU_BASE_URL }),
    });
    console.log('[Novu Email Service] ✅ Client initialized with legacy API key');
  } else {
    initializationError = 'Missing NOVU_SECRET_KEY or NOVU_API_KEY environment variable';
    console.error(`[Novu Email Service] ❌ ${initializationError}`);
  }
} catch (error) {
  initializationError = `Initialization failed: ${error}`;
  console.error('[Novu Email Service] ❌ Failed to initialize:', error);
}

/**
 * Enhanced email service that integrates Novu workflows with Resend templates
 * This allows you to use your existing beautiful email templates with Novu's workflow orchestration
 */

// ELEVA-31: Template Selector Interface for dynamic template selection
interface TemplateSelector {
  workflowId: string;
  eventType: string;
  userSegment: 'patient' | 'expert' | 'admin';
  locale: string;
  templateVariant: 'default' | 'urgent' | 'reminder' | 'minimal' | 'branded';
}

interface NovuEmailOptions {
  workflowId: string;
  subscriberId: string;
  templateType:
    | 'appointment-confirmation'
    | 'payment-success'
    | 'expert-welcome'
    | 'expert-payout-notification'
    | 'custom';
  templateData: Record<string, unknown>;
  overrides?: {
    from?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
    email?: {
      to?: string;
      subject?: string;
    };
  };
}

// ELEVA-31: Enhanced email rendering with template selection logic
interface EnhancedEmailOptions extends NovuEmailOptions {
  userSegment?: 'patient' | 'expert' | 'admin';
  templateVariant?: 'default' | 'urgent' | 'reminder' | 'minimal' | 'branded';
  locale?: string;
}

interface ResendEmailOptions {
  to: string;
  templateType:
    | 'appointment-confirmation'
    | 'payment-success'
    | 'expert-welcome'
    | 'expert-payout-notification';
  templateData: Record<string, unknown>;
  locale?: string;
}

interface EmailGenerationResult {
  html: string;
  text: string;
  subject: string;
}

interface TriggerWorkflowPayload {
  subscriberId: string;
  [key: string]: unknown;
}

/**
 * ELEVA-31: Dynamic template selection based on workflow, user segment, and variant
 */
export class TemplateSelectionService {
  private templateMappings: Record<
    string,
    Record<string, Record<string, Record<string, React.ComponentType<Record<string, unknown>>>>>
  > = {
    // User lifecycle workflows
    'user-lifecycle': {
      welcome: {
        patient: {
          default: WelcomeEmailTemplate,
          minimal: WelcomeEmailTemplate, // Could be different template
          branded: WelcomeEmailTemplate, // Could be different template
        },
        expert: {
          default: WelcomeEmailTemplate,
          minimal: WelcomeEmailTemplate,
          branded: WelcomeEmailTemplate,
        },
        admin: {
          default: WelcomeEmailTemplate,
          minimal: WelcomeEmailTemplate,
          branded: WelcomeEmailTemplate,
        },
      },
    },

    // Appointment workflows
    //
    // Phase 4 fix: 'reminder' previously pointed to AppointmentConfirmationTemplate,
    // which is why reminder emails were rendered as "✅ Appointment Confirmed!".
    // Now correctly routes patient reminders to AppointmentReminderEmail and
    // expert notifications to ExpertNewAppointmentTemplate.
    'appointment-universal': {
      confirmed: {
        patient: {
          default: AppointmentConfirmationTemplate,
          urgent: AppointmentConfirmationTemplate,
          reminder: AppointmentConfirmationTemplate,
        },
        expert: {
          default: asTemplate(ExpertNewAppointmentTemplate),
          urgent: asTemplate(ExpertNewAppointmentTemplate),
          reminder: asTemplate(ExpertNewAppointmentTemplate),
        },
      },
      reminder: {
        patient: {
          default: asTemplate(AppointmentReminderEmail),
          urgent: asTemplate(AppointmentReminderEmail),
          reminder: asTemplate(AppointmentReminderEmail),
        },
        expert: {
          default: asTemplate(ExpertNewAppointmentTemplate),
          urgent: asTemplate(ExpertNewAppointmentTemplate),
          reminder: asTemplate(ExpertNewAppointmentTemplate),
        },
      },
      cancelled: {
        patient: {
          default: AppointmentConfirmationTemplate,
          urgent: AppointmentConfirmationTemplate,
        },
        expert: {
          default: asTemplate(ExpertNewAppointmentTemplate),
          urgent: asTemplate(ExpertNewAppointmentTemplate),
        },
      },
      default: {
        patient: {
          default: AppointmentConfirmationTemplate,
          urgent: AppointmentConfirmationTemplate,
        },
        expert: {
          default: asTemplate(ExpertNewAppointmentTemplate),
          urgent: asTemplate(ExpertNewAppointmentTemplate),
        },
      },
    },

    // Payment workflows
    'payment-universal': {
      success: {
        patient: {
          default: PaymentConfirmationTemplate,
          branded: PaymentConfirmationTemplate,
        },
        expert: {
          default: PaymentConfirmationTemplate,
          branded: PaymentConfirmationTemplate,
        },
      },
      confirmed: {
        patient: {
          default: PaymentConfirmationTemplate,
          branded: PaymentConfirmationTemplate,
        },
        expert: {
          default: PaymentConfirmationTemplate,
          branded: PaymentConfirmationTemplate,
        },
      },
      pending: {
        patient: {
          default: MultibancoBookingPendingTemplate,
          branded: MultibancoBookingPendingTemplate,
        },
        expert: {
          default: MultibancoBookingPendingTemplate,
          branded: MultibancoBookingPendingTemplate,
        },
      },
      failed: {
        patient: {
          default: MultibancoBookingPendingTemplate,
          branded: MultibancoBookingPendingTemplate,
        },
        expert: {
          default: MultibancoBookingPendingTemplate,
          branded: MultibancoBookingPendingTemplate,
        },
      },
    },

    // Direct template workflows
    'appointment-confirmation': {
      default: {
        patient: {
          default: AppointmentConfirmationTemplate,
          minimal: AppointmentConfirmationTemplate,
          branded: AppointmentConfirmationTemplate,
        },
        expert: {
          default: AppointmentConfirmationTemplate,
          minimal: AppointmentConfirmationTemplate,
          branded: AppointmentConfirmationTemplate,
        },
      },
    },

    'multibanco-booking-pending': {
      default: {
        patient: {
          default: MultibancoBookingPendingTemplate,
          urgent: MultibancoBookingPendingTemplate,
          branded: MultibancoBookingPendingTemplate,
        },
      },
    },

    // Phase 4 fix: the cron at app/api/cron/send-payment-reminders/route.ts
    // triggers this workflow with eventType 'gentle' or 'urgent' depending on
    // how close the voucher is to expiring. Without these entries
    // selectTemplate() returned null and the selection path threw.
    'multibanco-payment-reminder': {
      default: {
        patient: {
          default: MultibancoPaymentReminderTemplate,
          urgent: MultibancoPaymentReminderTemplate,
          reminder: MultibancoPaymentReminderTemplate,
        },
      },
      gentle: {
        patient: {
          default: MultibancoPaymentReminderTemplate,
          reminder: MultibancoPaymentReminderTemplate,
        },
      },
      urgent: {
        patient: {
          default: MultibancoPaymentReminderTemplate,
          urgent: MultibancoPaymentReminderTemplate,
        },
      },
    },

    // Phase 4 fix: payout notifications use eventType 'payout' (not 'default').
    // Also moved under userSegment 'expert' since these are expert-only emails.
    'expert-payout-notification': {
      default: {
        expert: {
          default: ExpertPayoutNotificationTemplate,
          urgent: ExpertPayoutNotificationTemplate,
          reminder: ExpertPayoutNotificationTemplate,
        },
      },
      payout: {
        expert: {
          default: ExpertPayoutNotificationTemplate,
          urgent: ExpertPayoutNotificationTemplate,
        },
      },
    },

    // Real eventType values for this workflow come from the dynamic
    // `notificationType` field at the call site (e.g. 'appointment_cancelled',
    // 'account_update'). Listing every possible value here is impractical, so
    // `selectTemplate` falls back to the `default` event mapping for any
    // unknown event — see the catch-all logic below.
    'expert-notification': {
      default: {
        expert: {
          default: asTemplate(ExpertNotificationEmail),
        },
      },
    },

    'reservation-expired': {
      default: {
        patient: {
          default: asTemplate(ReservationExpiredEmail),
        },
        expert: {
          default: asTemplate(ReservationExpiredEmail),
        },
      },
    },
  };

  /**
   * Select the appropriate template based on workflow, event type, user segment, and variant
   */
  selectTemplate(selector: TemplateSelector): React.ComponentType<Record<string, unknown>> | null {
    const { workflowId, eventType, userSegment, templateVariant } = selector;

    // Navigate through the mapping structure
    const workflowMapping = this.templateMappings[workflowId];
    if (!workflowMapping) {
      console.warn(`[TemplateSelector] No mapping found for workflow: ${workflowId}`);
      return null;
    }

    // Look up the event by exact match, then fall back to the workflow's
    // 'default' event entry. This is essential for workflows like
    // 'expert-notification' whose eventType is dynamic (driven by the
    // caller's `notificationType` string) — without the fallback, every
    // unknown event would return null and the selection path would throw.
    const eventMapping = workflowMapping[eventType] ?? workflowMapping['default'];
    if (!eventMapping) {
      console.warn(
        `[TemplateSelector] No mapping found for event: ${eventType} in workflow: ${workflowId} (and no 'default' event entry)`,
      );
      return null;
    }

    const segmentMapping = eventMapping[userSegment];
    if (!segmentMapping) {
      console.warn(`[TemplateSelector] No mapping found for user segment: ${userSegment}`);
      // Fallback to patient if available
      const fallbackMapping = eventMapping['patient'];
      if (fallbackMapping) {
        return fallbackMapping[templateVariant] || fallbackMapping['default'] || null;
      }
      return null;
    }

    const template = segmentMapping[templateVariant] || segmentMapping['default'];
    if (!template) {
      console.warn(
        `[TemplateSelector] No template found for variant: ${templateVariant}, falling back to default`,
      );
      return segmentMapping['default'] || null;
    }

    return template;
  }

  /**
   * Get template with additional context for A/B testing
   */
  selectTemplateWithContext(
    selector: TemplateSelector,
    context?: { experimentId?: string; variantId?: string },
  ): {
    template: React.ComponentType<Record<string, unknown>> | null;
    metadata: Record<string, unknown>;
  } {
    const template = this.selectTemplate(selector);

    return {
      template,
      metadata: {
        selector,
        context,
        selectedAt: new Date().toISOString(),
        fallbackUsed:
          template !==
          this.templateMappings[selector.workflowId]?.[selector.eventType]?.[
            selector.userSegment
          ]?.[selector.templateVariant],
      },
    };
  }

  /**
   * A/B Testing support: Select template based on experiment configuration
   */
  selectTemplateForExperiment(
    baseSelector: TemplateSelector,
    experimentConfig?: {
      experimentId: string;
      userId: string;
      variants: Array<{
        id: string;
        weight: number;
        templateVariant: TemplateSelector['templateVariant'];
      }>;
    },
  ): { template: React.ComponentType<Record<string, unknown>> | null; selectedVariant?: string } {
    if (!experimentConfig) {
      return { template: this.selectTemplate(baseSelector) };
    }

    // Simple hash-based A/B testing
    const hash = this.hashUserId(experimentConfig.userId, experimentConfig.experimentId);
    const totalWeight = experimentConfig.variants.reduce((sum, v) => sum + v.weight, 0);
    const threshold = ((hash % 100) / 100) * totalWeight;

    let currentWeight = 0;
    for (const variant of experimentConfig.variants) {
      currentWeight += variant.weight;
      if (threshold <= currentWeight) {
        const experimentSelector: TemplateSelector = {
          ...baseSelector,
          templateVariant: variant.templateVariant,
        };

        return {
          template: this.selectTemplate(experimentSelector),
          selectedVariant: variant.id,
        };
      }
    }

    // Fallback to default
    return { template: this.selectTemplate(baseSelector) };
  }

  /**
   * Simple hash function for consistent A/B testing
   */
  private hashUserId(userId: string, experimentId: string): number {
    const str = `${userId}-${experimentId}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Create global instance
export const templateSelectionService = new TemplateSelectionService();

/**
 * Phase 4 (fix_fake_email_content_bug): typed prop adapters.
 *
 * The dynamic selection layer used to spread the workflow payload directly onto
 * the destination template — but workflow payloads use one set of names
 * (`userName`, `customerName`, `serviceName`, `meetingUrl`, …) and templates
 * expect different ones (`patientName`, `clientName`, `eventTitle`, `meetLink`,
 * …). The mismatch caused every prop to fall through to the template's default
 * (which was a realistic-looking sample like "João Silva" / "Consulta de
 * Cardiologia"), leaking that sample data into production emails.
 *
 * Each adapter takes a workflow payload and returns the prop bag for the
 * specific destination template. If no adapter is registered for a given
 * `(workflowId, eventType, userSegment)` triple, `getPropAdapter` returns the
 * identity function so the caller can detect the gap and fail loudly via
 * `selectTemplate` returning null OR the template rendering with empty props
 * (now safe, since Phase 2 made template defaults neutral).
 */
type PropAdapter = (data: Record<string, unknown>) => Record<string, unknown>;

const passThrough: PropAdapter = (data) => data;

const propAdapters: Record<string, Record<string, Record<string, PropAdapter>>> = {
  'appointment-universal': {
    confirmed: {
      // server/googleCalendar.ts → patient confirmation. The workflow payload
      // already happens to match AppointmentConfirmationTemplate's prop names
      // for most fields, but customerName/serviceName/meetingUrl need renaming.
      patient: (data) => ({
        expertName: data.expertName,
        clientName: data.customerName ?? data.clientName,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        timezone: data.timezone,
        appointmentDuration: data.appointmentDuration,
        eventTitle: data.serviceName ?? data.eventTitle,
        meetLink: data.meetingUrl ?? data.meetLink,
        notes: data.notes,
        locale: data.locale,
      }),
      expert: (data) => ({
        expertName: data.expertName,
        clientName: data.customerName ?? data.clientName,
        clientPhone: data.clientPhone,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        timezone: data.timezone,
        appointmentDuration: data.appointmentDuration,
        eventTitle: data.serviceName ?? data.eventTitle,
        meetLink: data.meetingUrl ?? data.meetLink,
        notes: data.notes,
        locale: data.locale,
      }),
    },
    reminder: {
      // app/api/cron/appointment-reminders/route.ts → patient reminder.
      patient: (data) => ({
        patientName: data.customerName ?? data.userName ?? data.patientName,
        expertName: data.expertName,
        appointmentType: data.serviceName ?? data.appointmentType,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        timezone: data.timezone,
        duration: data.duration,
        meetingLink: data.meetingUrl ?? data.meetingLink,
        locale: data.locale,
      }),
      // Same cron, expert branch.
      expert: (data) => ({
        expertName: data.expertName,
        clientName: data.customerName ?? data.clientName,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        timezone: data.timezone,
        appointmentDuration: data.appointmentDuration,
        eventTitle: data.serviceName ?? data.eventTitle,
        meetLink: data.meetingUrl ?? data.meetLink,
        notes: data.message ?? data.notes,
        locale: data.locale,
      }),
    },
  },
  'payment-universal': {
    success: {
      // app/api/webhooks/stripe/handlers/payment.ts → flatten appointmentDetails.
      patient: (data) => {
        const details = (data.appointmentDetails as Record<string, unknown> | undefined) ?? {};
        return {
          customerName: data.customerName,
          amount: data.amount,
          currency: data.currency,
          transactionId: data.transactionId,
          expertName: details.expert,
          serviceName: details.service,
          appointmentDate: details.date,
          appointmentTime: details.time,
          locale: data.locale,
        };
      },
    },
    failed: {
      patient: (data) => {
        const details = (data.appointmentDetails as Record<string, unknown> | undefined) ?? {};
        return {
          customerName: data.customerName,
          expertName: details.expert,
          serviceName: details.service,
          appointmentDate: details.date,
          appointmentTime: details.time,
          locale: data.locale,
        };
      },
    },
  },
  'multibanco-payment-reminder': {
    // app/api/cron/send-payment-reminders/route.ts uses these eventTypes.
    // The payload already matches MultibancoPaymentReminderTemplate's prop
    // names exactly, so the adapter is a pass-through but kept explicit so
    // future renames stay obvious.
    gentle: {
      patient: passThrough,
    },
    urgent: {
      patient: passThrough,
    },
    default: {
      patient: passThrough,
    },
  },
  'expert-payout-notification': {
    payout: {
      expert: (data) => ({
        expertName: data.expertName,
        payoutAmount: data.amount ?? data.payoutAmount,
        currency: data.currency,
        expectedArrivalDate: data.payoutDate ?? data.expectedArrivalDate,
        payoutId: data.transactionId ?? data.payoutId,
        clientName: data.clientName,
        serviceName: data.serviceName,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        bankLastFour: data.bankLastFour,
        _locale: data.locale ?? data._locale,
      }),
    },
    default: {
      expert: (data) => ({
        expertName: data.expertName,
        payoutAmount: data.amount ?? data.payoutAmount,
        currency: data.currency,
        expectedArrivalDate: data.payoutDate ?? data.expectedArrivalDate,
        payoutId: data.transactionId ?? data.payoutId,
        _locale: data.locale ?? data._locale,
      }),
    },
  },
  'expert-notification': {
    default: {
      expert: (data) => ({
        expertName: data.expertName,
        notificationTitle: data.notificationType ?? data.notificationTitle,
        notificationMessage: data.message ?? data.notificationMessage,
        actionUrl: data.actionUrl,
        actionText: data.actionText,
      }),
    },
  },
};

/**
 * Resolves the prop adapter for a given `(workflowId, eventType, userSegment)`
 * triple. Adapters translate workflow trigger payloads into the destination
 * template's prop bag — they're the bridge that prevents workflow-key /
 * template-prop mismatches from falling through to template defaults (the
 * original placeholder-leak bug).
 *
 * Falls back gracefully:
 *   - unknown workflowId → identity adapter (pass-through)
 *   - unknown eventType → looks up the workflow's `default` event entry
 *   - unknown userSegment → looks up the event's `patient` entry
 *   - still nothing → identity adapter
 *
 * @example
 * ```ts
 * const adapter = getPropAdapter({
 *   workflowId: 'appointment-universal',
 *   eventType: 'reminder',
 *   userSegment: 'patient',
 *   locale: 'en',
 *   templateVariant: 'default',
 * });
 *
 * const templateProps = adapter({
 *   userName: 'Matilde',
 *   serviceName: 'Physio',
 *   meetingUrl: 'https://meet.google.com/abc',
 *   // ...
 * });
 * // templateProps.patientName === 'Matilde'
 * // templateProps.appointmentType === 'Physio'
 * // templateProps.meetingLink === 'https://meet.google.com/abc'
 * ```
 */
export function getPropAdapter(selector: TemplateSelector): PropAdapter {
  const warn = (reason: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[getPropAdapter] ${reason} (workflowId=${selector.workflowId}, eventType=${selector.eventType}, userSegment=${selector.userSegment}). Falling back to passThrough — this is the configuration gap that originally caused the placeholder-leak bug.`,
      );
    }
  };

  const byEvent = propAdapters[selector.workflowId];
  if (!byEvent) {
    warn('No adapter for workflowId');
    return passThrough;
  }
  const bySegment = byEvent[selector.eventType] ?? byEvent['default'];
  if (!bySegment) {
    warn('No adapter for eventType (and no default event entry)');
    return passThrough;
  }
  const adapter = bySegment[selector.userSegment] ?? bySegment['patient'];
  if (!adapter) {
    warn('No adapter for userSegment (and no patient fallback)');
    return passThrough;
  }
  return adapter;
}

/**
 * Phase 6 (fix_fake_email_content_bug): structured breadcrumb so any future
 * placeholder-leak / wrong-template incident is observable in Sentry within
 * seconds instead of via customer complaints.
 *
 * Logs `{ workflowId, eventType, providedKeys, templateName, locale }` on
 * every email render path (dynamic + manual). `providedKeys` lists the keys
 * actually present in the payload — so when an expected key (e.g. `clientName`)
 * is missing, that absence is visible in the trail leading up to the email send.
 */
function recordRenderBreadcrumb(params: {
  workflowId?: string;
  eventType?: string;
  templateName: string;
  data: Record<string, unknown>;
}): void {
  try {
    Sentry.addBreadcrumb({
      category: 'email.render',
      level: 'info',
      message: `Rendering ${params.templateName}`,
      data: {
        workflowId: params.workflowId,
        eventType: params.eventType,
        templateName: params.templateName,
        locale: (params.data.locale as string | undefined) ?? 'en',
        providedKeys: Object.keys(params.data).sort(),
      },
    });
  } catch (err) {
    // Sentry must never break email rendering, but surface the failure
    // during local development so a misconfigured DSN is visible immediately.
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[email.render] Sentry breadcrumb failed:', err);
    }
  }
}

/**
 * Send an email using Novu workflow + Resend service with enhanced template selection
 */
export async function sendNovuEmailEnhanced(options: EnhancedEmailOptions) {
  try {
    const {
      workflowId,
      subscriberId,
      templateData,
      overrides,
      userSegment = 'patient',
      templateVariant = 'default',
      locale = 'en',
    } = options;

    if (!novu) {
      throw new Error('Novu client not initialized. Cannot send email.');
    }

    const result = await novu.trigger({
      workflowId,
      to: { subscriberId },
      payload: {
        ...templateData,
        // Add template selection context to payload
        _templateContext: {
          userSegment,
          templateVariant,
          locale,
        },
      },
      overrides: overrides ? { email: overrides } : undefined,
    });

    console.log('Enhanced Novu email triggered successfully for workflow:', workflowId, {
      userSegment,
      templateVariant,
      locale,
    });

    return result;
  } catch (error) {
    console.error('Failed to send enhanced Novu email:', error);
    throw error;
  }
}

/**
 * Send an email using Novu workflow + Resend service
 * This combines Novu's workflow management with your existing Resend email templates
 */
export async function sendNovuEmail(options: NovuEmailOptions) {
  try {
    const { workflowId, subscriberId, templateData, overrides } = options;

    if (!novu) {
      throw new Error('Novu client not initialized. Cannot send email.');
    }

    const result = await novu.trigger({
      workflowId,
      to: { subscriberId },
      payload: templateData,
      overrides: overrides ? { email: overrides } : undefined,
    });

    console.log('Novu email triggered successfully for workflow:', workflowId);

    return result;
  } catch (error) {
    console.error('Failed to send Novu email:', error);
    throw error;
  }
}

export async function sendNovuEmailWithCustomTemplate(
  workflowId: string,
  subscriberId: string,
  templateData: Record<string, unknown>,
  customTemplate: () => string,
) {
  try {
    const emailContent = customTemplate();

    if (!novu) {
      throw new Error('Novu client not initialized. Cannot send email.');
    }

    const result = await novu.trigger({
      workflowId,
      to: { subscriberId },
      payload: {
        ...templateData,
        customEmailContent: emailContent,
      },
    });

    console.log('Custom template email sent via Novu for workflow:', workflowId);
    return result;
  } catch (error) {
    console.error('Failed to send custom template email:', error);
    throw error;
  }
}

/**
 * Direct email sending using Resend (bypassing Novu for immediate emails)
 * Use this for critical emails that need to be sent immediately
 */
export async function sendDirectResendEmail(options: ResendEmailOptions) {
  const { to, templateType, templateData } = options;

  try {
    let emailContent: EmailGenerationResult;

    switch (templateType) {
      case 'appointment-confirmation':
        emailContent = await generateAppointmentConfirmationEmail(templateData);
        break;
      case 'payment-success':
        emailContent = await generatePaymentSuccessEmail(templateData);
        break;
      case 'expert-welcome':
        emailContent = await generateExpertWelcomeEmail(templateData);
        break;
      case 'expert-payout-notification':
        emailContent = await generateExpertPayoutNotificationEmail(templateData);
        break;
      default:
        throw new Error(`Unknown template type: ${templateType}`);
    }

    const result = await sendEmail({
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    console.log('Email sent successfully via Resend:', result);
    return result;
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    throw error;
  }
}

async function generateAppointmentConfirmationEmail(
  data: Record<string, unknown>,
): Promise<EmailGenerationResult> {
  const { html: appointmentHtml } = await generateAppointmentEmail(
    data as Parameters<typeof generateAppointmentEmail>[0],
  );
  const subject = 'Appointment Confirmation - Eleva.care';
  const htmlTagRegex = /<[^>]*>/g;
  const text = appointmentHtml.replace(htmlTagRegex, '');

  return { html: appointmentHtml, text, subject };
}

async function generatePaymentSuccessEmail(
  data: Record<string, unknown>,
): Promise<EmailGenerationResult> {
  const subject = 'Payment Successful - Eleva.care';
  const html = `
    <h1>Payment Confirmation</h1>
    <p>Dear ${data.customerName || 'Customer'},</p>
    <p>Your payment of ${data.amount || 'N/A'} has been successfully processed.</p>
    <p>Thank you for choosing Eleva.care!</p>
    <p>Best regards,<br>The Eleva.care Team</p>
  `;
  const htmlTagRegex = /<[^>]*>/g;
  const text = html.replace(htmlTagRegex, '');

  return { html, text, subject };
}

async function generateExpertWelcomeEmail(
  data: Record<string, unknown>,
): Promise<EmailGenerationResult> {
  const subject = 'Welcome to Eleva.care - Expert Onboarding';
  const html = `
    <h1>Welcome to Eleva.care!</h1>
    <p>Dear ${data.expertName || 'Expert'},</p>
    <p>Welcome to the Eleva.care platform. We're excited to have you join our community of experts.</p>
    <p>Your next steps:</p>
    <ul>
      <li>Complete your profile setup</li>
      <li>Set your availability</li>
      <li>Start helping clients</li>
    </ul>
    <p>Best regards,<br>The Eleva.care Team</p>
  `;
  const htmlTagRegex = /<[^>]*>/g;
  const text = html.replace(htmlTagRegex, '');

  return { html, text, subject };
}

async function generateExpertPayoutNotificationEmail(
  data: Record<string, unknown>,
): Promise<EmailGenerationResult> {
  const html = await render(
    React.createElement(
      ExpertPayoutNotificationTemplate,
      data as Parameters<typeof ExpertPayoutNotificationTemplate>[0],
    ),
  );

  const expertName = (data.expertName as string) || 'Expert';
  const amount = (data.payoutAmount as string) || '0.00';
  const currency = (data.currency as string) || 'EUR';
  const clientName = (data.clientName as string) || 'Client';

  return {
    subject: `💰 Payout sent: ${currency} ${amount} for your appointment with ${clientName}`,
    html,
    text: `Hello ${expertName}! Your earnings of ${currency} ${amount} from your appointment with ${clientName} have been sent to your bank account. Expected arrival: 1-2 business days.`,
  };
}

/**
 * Utility function to get subscriber info for emails
 */
export async function getSubscriberForEmail(clerkUserId: string) {
  try {
    // You can enhance this to get subscriber data from your database
    return {
      subscriberId: clerkUserId,
      // Add other subscriber fields as needed
    };
  } catch (error) {
    console.error('Failed to get subscriber for email:', error);
    return null;
  }
}

export async function triggerNovuWorkflow(workflowId: string, payload: TriggerWorkflowPayload) {
  if (!novu) {
    const errorMsg = `[Novu Email Service] Cannot trigger workflow ${workflowId}: ${initializationError || 'client not initialized'}`;
    console.error(errorMsg);
    throw new Error(initializationError || 'Novu client not initialized');
  }

  try {
    console.log('[Novu Email Service] 🔔 Triggering workflow:', {
      workflowId,
      subscriberId: payload.subscriberId,
    });

    const result = await novu.trigger({
      workflowId,
      to: payload.subscriberId,
      payload,
    });

    console.log('[Novu Email Service] ✅ Successfully triggered workflow:', workflowId);
    return result;
  } catch (error) {
    console.error('[Novu Email Service] ❌ Failed to trigger workflow:', {
      workflowId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Enhanced email rendering service for existing React Email templates
 * Integrates with Novu workflows while preserving existing beautiful templates
 * ELEVA-31: Now supports dynamic template selection based on user segment and variants
 */
export class ElevaEmailService {
  private resendEmailUrl = process.env.RESEND_EMAIL_URL || 'updates@notifications.eleva.care';

  /**
   * ELEVA-31: Enhanced render method with template selection
   */
  async renderEmailWithSelection(
    selector: TemplateSelector,
    data: Record<string, unknown>,
    experimentConfig?: {
      experimentId: string;
      userId: string;
      variants: Array<{
        id: string;
        weight: number;
        templateVariant: TemplateSelector['templateVariant'];
      }>;
    },
  ) {
    // Hard runtime guard: until the dynamic selection path is fully covered
    // by template mappings + prop adapters + tests, refuse to render through
    // it. The flag flip is the explicit opt-in, gated by an env var
    // (`NOVU_ENABLE_DYNAMIC_TEMPLATE_SELECTION=true`). This makes the
    // production placeholder-leak bug structurally impossible to reintroduce
    // by accident — any caller who tries gets a loud error instead of a
    // silently-broken email.
    if (!ENABLE_DYNAMIC_TEMPLATE_SELECTION) {
      throw new Error(
        '[ElevaEmailService] renderEmailWithSelection is disabled by default ' +
          '(see fix_fake_email_content_bug). Set ' +
          'NOVU_ENABLE_DYNAMIC_TEMPLATE_SELECTION=true to enable, but only ' +
          'after verifying the workflow has a templateMappings entry AND a ' +
          'matching prop adapter AND regression tests in ' +
          'tests/lib/integrations/novu/.',
      );
    }

    // Select template based on criteria
    const { template, selectedVariant } = templateSelectionService.selectTemplateForExperiment(
      selector,
      experimentConfig,
    );

    if (!template) {
      throw new Error(`No template found for selector: ${JSON.stringify(selector)}`);
    }

    // Phase 4: translate workflow payload → template props before rendering.
    // Without this step, props with mismatched names fall through to the
    // template's default values (the original placeholder-leak bug).
    const adapter = getPropAdapter(selector);
    const adaptedProps = adapter(data);

    recordRenderBreadcrumb({
      workflowId: selector.workflowId,
      eventType: selector.eventType,
      templateName: template.displayName ?? template.name ?? 'Unknown',
      data: adaptedProps,
    });

    const renderedTemplate = React.createElement(template, adaptedProps);
    const htmlContent = render(renderedTemplate);

    return {
      html: htmlContent,
      metadata: {
        selector,
        selectedVariant,
        renderedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Render appointment confirmation email with enhanced selection
   */
  async renderAppointmentConfirmation(data: {
    expertName: string;
    clientName: string;
    appointmentDate: string;
    appointmentTime: string;
    timezone: string;
    appointmentDuration: string;
    eventTitle: string;
    meetLink?: string;
    notes?: string;
    locale?: string;
    // ELEVA-31: Enhanced options accepted for forward compatibility but currently unused.
    // The dynamic selection path is disabled in Phase 1 because it spreads workflow
    // payloads onto templates without prop-name translation, which leaks placeholder
    // defaults like "João Silva" into production emails. The manual mapping below is
    // the only correct path. See plan: fix_fake_email_content_bug.
    userSegment?: 'patient' | 'expert' | 'admin';
    templateVariant?: 'default' | 'urgent' | 'reminder' | 'minimal' | 'branded';
    workflowId?: string;
    eventType?: string;
  }) {
    recordRenderBreadcrumb({
      workflowId: data.workflowId ?? 'appointment-universal',
      eventType: data.eventType ?? 'confirmed',
      templateName: 'AppointmentConfirmationTemplate',
      data: data as unknown as Record<string, unknown>,
    });

    const template = React.createElement(AppointmentConfirmationTemplate, {
      expertName: data.expertName,
      clientName: data.clientName,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      timezone: data.timezone,
      appointmentDuration: data.appointmentDuration,
      eventTitle: data.eventTitle,
      meetLink: data.meetLink,
      notes: data.notes,
      locale: data.locale || 'en',
    });

    return render(template);
  }

  /**
   * Render expert new appointment notification email
   *
   * This method renders the ExpertNewAppointmentTemplate for notifying experts
   * when a patient books an appointment with them. It returns the rendered HTML
   * string suitable for sending via email.
   *
   * @param data - The appointment data to render
   * @param data.expertName - Name of the expert receiving the notification
   * @param data.clientName - Name of the patient who booked the appointment
   * @param data.appointmentDate - Formatted appointment date (e.g., "Wednesday, January 21, 2026")
   * @param data.appointmentTime - Formatted appointment time (e.g., "12:30 PM")
   * @param data.timezone - Timezone for the appointment (e.g., "Europe/Lisbon")
   * @param data.appointmentDuration - Duration string (e.g., "45 minutes")
   * @param data.eventTitle - Title of the appointment type (e.g., "Physical Therapy Appointment")
   * @param data.meetLink - Optional video meeting link
   * @param data.notes - Optional notes from the patient
   * @param data.locale - Locale for internationalization (default: 'en')
   * @returns Promise<string> - The rendered HTML email content
   *
   * @example
   * ```typescript
   * const emailService = new ElevaEmailService();
   * const html = await emailService.renderExpertNewAppointment({
   *   expertName: 'Patricia Mota',
   *   clientName: 'Marta Carvalho',
   *   appointmentDate: 'Wednesday, January 21, 2026',
   *   appointmentTime: '12:30 PM',
   *   timezone: 'Europe/Lisbon',
   *   appointmentDuration: '45 minutes',
   *   eventTitle: 'Physical Therapy Appointment',
   *   meetLink: 'https://meet.google.com/abc-defg-hij',
   *   notes: 'First consultation',
   *   locale: 'en',
   * });
   * ```
   */
  async renderExpertNewAppointment(data: {
    expertName: string;
    clientName: string;
    clientPhone?: string;
    appointmentDate: string;
    appointmentTime: string;
    timezone: string;
    appointmentDuration: string;
    eventTitle: string;
    meetLink?: string;
    notes?: string;
    locale?: string;
  }) {
    // Validate and cast locale to SupportedLocale, defaulting to 'en'
    const validLocales: SupportedLocale[] = ['en', 'pt', 'es'];
    const locale: SupportedLocale = validLocales.includes(data.locale as SupportedLocale)
      ? (data.locale as SupportedLocale)
      : 'en';

    recordRenderBreadcrumb({
      workflowId: 'appointment-confirmation',
      eventType: 'expert-new',
      templateName: 'ExpertNewAppointmentTemplate',
      data: data as unknown as Record<string, unknown>,
    });

    const template = React.createElement(ExpertNewAppointmentTemplate, {
      expertName: data.expertName,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      timezone: data.timezone,
      appointmentDuration: data.appointmentDuration,
      eventTitle: data.eventTitle,
      meetLink: data.meetLink,
      notes: data.notes,
      locale,
    });

    return render(template);
  }

  /**
   * 🆕 Render welcome email using React Email template
   */
  async renderWelcomeEmail(data: {
    userName: string;
    firstName?: string;
    dashboardUrl?: string;
    locale?: string;
    // Phase 1: forward-compat options — selection path disabled, see comment above.
    userSegment?: 'patient' | 'expert' | 'admin';
    templateVariant?: 'default' | 'urgent' | 'reminder' | 'minimal' | 'branded';
  }) {
    recordRenderBreadcrumb({
      workflowId: 'user-lifecycle',
      eventType: 'welcome',
      templateName: 'WelcomeEmailTemplate',
      data: data as unknown as Record<string, unknown>,
    });

    const template = React.createElement(WelcomeEmailTemplate, {
      userName: data.userName,
      dashboardUrl: data.dashboardUrl || '/dashboard',
      locale: data.locale || 'en',
    });

    return render(template);
  }

  /**
   * 🆕 Render appointment reminder using React Email template
   */
  async renderAppointmentReminder(data: {
    userName: string;
    expertName: string;
    appointmentType: string;
    appointmentDate: string;
    appointmentTime: string;
    timezone?: string;
    duration?: number;
    meetingUrl?: string;
    timeUntilAppointment?: string;
    locale?: string;
    // Phase 1: forward-compat options — selection path disabled, see comment above.
    userSegment?: 'patient' | 'expert' | 'admin';
    templateVariant?: 'default' | 'urgent' | 'reminder' | 'minimal' | 'branded';
  }) {
    recordRenderBreadcrumb({
      workflowId: 'appointment-universal',
      eventType: 'reminder',
      templateName: 'AppointmentReminderEmail',
      data: data as unknown as Record<string, unknown>,
    });

    const { default: AppointmentReminderTemplate } = await import(
      '@/emails/appointments/appointment-reminder'
    );

    // Narrow `locale` to SupportedLocale before passing to the template
    // (its prop type is `SupportedLocale`, not arbitrary strings).
    const validLocales: SupportedLocale[] = ['en', 'pt', 'es'];
    const locale: SupportedLocale = validLocales.includes(data.locale as SupportedLocale)
      ? (data.locale as SupportedLocale)
      : 'en';

    const template = React.createElement(AppointmentReminderTemplate, {
      patientName: data.userName,
      expertName: data.expertName,
      appointmentType: data.appointmentType,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      timezone: data.timezone,
      duration: data.duration,
      meetingLink: data.meetingUrl,
      locale,
    });

    return render(template);
  }

  /**
   * 🆕 Render payment confirmation using React Email template
   */
  async renderPaymentConfirmation(data: {
    customerName: string;
    amount: string;
    currency?: string;
    transactionId?: string;
    /**
     * Friendly payment-method label (e.g. "MB WAY", "Card"). Caller is
     * expected to map Stripe's snake_case `payment_method_types[0]` to a
     * human label (see `friendlyPaymentMethod` in the Stripe payment
     * handler). When omitted, the template hides the row.
     */
    paymentMethod?: string;
    /**
     * URL the customer can use to join their appointment (typically the
     * Google Meet link from `MeetingTable.meetingUrl`). Renders the "Join
     * Appointment" CTA button when present.
     */
    appointmentUrl?: string;
    /**
     * Stripe-hosted receipt URL from the underlying charge
     * (`charge.receipt_url`). Renders the "Download Receipt" CTA button
     * when present.
     */
    receiptUrl?: string;
    appointmentDetails?: {
      service: string;
      expert: string;
      date: string;
      time: string;
      duration?: string;
    };
    locale?: string;
    // Phase 1: forward-compat options — selection path disabled, see comment above.
    userSegment?: 'patient' | 'expert' | 'admin';
    templateVariant?: 'default' | 'urgent' | 'reminder' | 'minimal' | 'branded';
  }) {
    recordRenderBreadcrumb({
      workflowId: 'payment-universal',
      eventType: 'success',
      templateName: 'PaymentConfirmationTemplate',
      data: data as unknown as Record<string, unknown>,
    });

    const { default: PaymentConfirmationTemplate } = await import(
      '@/emails/payments/payment-confirmation'
    );

    const template = React.createElement(PaymentConfirmationTemplate, {
      customerName: data.customerName,
      amount: data.amount,
      currency: data.currency || 'EUR',
      transactionId: data.transactionId,
      paymentMethod: data.paymentMethod,
      appointmentUrl: data.appointmentUrl,
      receiptUrl: data.receiptUrl,
      expertName: data.appointmentDetails?.expert,
      serviceName: data.appointmentDetails?.service,
      appointmentDate: data.appointmentDetails?.date,
      appointmentTime: data.appointmentDetails?.time,
      locale: data.locale || 'en',
    });

    return render(template);
  }

  /**
   * 🆕 Render Multibanco payment reminder using React Email template
   */
  async renderMultibancoPaymentReminder(data: {
    customerName: string;
    entity: string;
    reference: string;
    amount: string;
    expiresAt: string;
    /**
     * Hosted Stripe voucher URL. The reminder template renders the "Pay now"
     * CTA button only when this is non-empty (the cron at
     * `app/api/cron/send-payment-reminders/route.ts` retrieves it from
     * `payment_intent.next_action.multibanco_display_details.hosted_voucher_url`).
     * Without this, the entire reminder loses its primary CTA.
     */
    hostedVoucherUrl?: string;
    /** Customer's timezone, appended to the appointment time row in the template. */
    timezone?: string;
    /** Optional notes captured at booking; rendered as its own row when present. */
    customerNotes?: string;
    appointmentDetails?: {
      service: string;
      expert: string;
      date: string;
      time: string;
      duration: string;
    };
    reminderType: 'gentle' | 'urgent';
    /** Used for the urgent banner countdown copy in the template. */
    daysRemaining?: number;
    locale?: string;
    // Phase 1: forward-compat options — selection path disabled, see comment above.
    userSegment?: 'patient' | 'expert' | 'admin';
    templateVariant?: 'default' | 'urgent' | 'reminder' | 'minimal' | 'branded';
  }) {
    recordRenderBreadcrumb({
      workflowId: 'multibanco-payment-reminder',
      eventType: data.reminderType,
      templateName: 'MultibancoPaymentReminderTemplate',
      data: data as unknown as Record<string, unknown>,
    });

    const template = React.createElement(MultibancoPaymentReminderTemplate, {
      customerName: data.customerName,
      multibancoEntity: data.entity,
      multibancoReference: data.reference,
      multibancoAmount: data.amount,
      voucherExpiresAt: data.expiresAt,
      hostedVoucherUrl: data.hostedVoucherUrl,
      expertName: data.appointmentDetails?.expert,
      serviceName: data.appointmentDetails?.service,
      appointmentDate: data.appointmentDetails?.date,
      appointmentTime: data.appointmentDetails?.time,
      timezone: data.timezone,
      duration: data.appointmentDetails?.duration
        ? parseInt(data.appointmentDetails.duration)
        : undefined,
      customerNotes: data.customerNotes,
      reminderType: data.reminderType,
      daysRemaining: data.daysRemaining,
      locale: data.locale || 'en',
    });

    return render(template);
  }

  /**
   * 🆕 Render expert payout notification using React Email template
   */
  async renderExpertPayoutNotification(data: {
    expertName: string;
    amount: string;
    currency?: string;
    payoutDate: string;
    payoutMethod: string;
    transactionId?: string;
    locale?: string;
    // Phase 1: forward-compat options — selection path disabled, see comment above.
    userSegment?: 'patient' | 'expert' | 'admin';
    templateVariant?: 'default' | 'urgent' | 'reminder' | 'minimal' | 'branded';
  }) {
    recordRenderBreadcrumb({
      workflowId: 'expert-payout-notification',
      eventType: 'payout',
      templateName: 'ExpertPayoutNotificationTemplate',
      data: data as unknown as Record<string, unknown>,
    });

    const template = React.createElement(ExpertPayoutNotificationTemplate, {
      expertName: data.expertName,
      payoutAmount: data.amount,
      currency: data.currency || 'EUR',
      expectedArrivalDate: data.payoutDate,
      payoutId: data.transactionId,
      _locale: data.locale || 'en',
    });

    return render(template);
  }

  /**
   * 🆕 Render refund notification using React Email template
   *
   * Used when an appointment is cancelled due to conflicts (e.g., late Multibanco payment
   * where the slot was already booked by another client).
   *
   * @example
   * ```typescript
   * const html = await elevaEmailService.renderRefundNotification({
   *   customerName: 'Marta Silva',
   *   expertName: 'Dr. Patricia Mota',
   *   serviceName: 'Physical Therapy Appointment',
   *   appointmentDate: 'Tuesday, February 3, 2026',
   *   appointmentTime: '11:30 AM',
   *   originalAmount: '70.00',
   *   refundAmount: '70.00',
   *   currency: 'EUR',
   *   refundReason: 'time_range_overlap',
   *   transactionId: 'pi_3Srm1DK5Ap4Um3Sp1JZyQgo9',
   *   locale: 'pt',
   * });
   * ```
   */
  async renderRefundNotification(data: {
    customerName: string;
    expertName: string;
    serviceName?: string;
    appointmentDate: string;
    appointmentTime: string;
    originalAmount: string;
    refundAmount: string;
    currency?: string;
    refundReason: string;
    transactionId?: string;
    locale?: string;
  }): Promise<string> {
    const locale = (
      data.locale?.startsWith('pt') ? 'pt' : data.locale?.startsWith('es') ? 'es' : 'en'
    ) as SupportedLocale;

    recordRenderBreadcrumb({
      workflowId: 'payment-universal',
      eventType: 'refund',
      templateName: 'RefundNotificationTemplate',
      data: data as unknown as Record<string, unknown>,
    });

    const template = React.createElement(RefundNotificationTemplate, {
      customerName: data.customerName,
      expertName: data.expertName,
      serviceName: data.serviceName || 'Appointment',
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      originalAmount: data.originalAmount,
      refundAmount: data.refundAmount,
      currency: data.currency || 'EUR',
      refundReason: data.refundReason,
      transactionId: data.transactionId,
      locale,
    });

    return render(template);
  }

  /**
   * 🆕 Render expert notification using React Email template
   */
  async renderExpertNotification(data: {
    expertName: string;
    notificationType: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    locale?: string;
    // Phase 1: forward-compat options — selection path disabled, see comment above.
    userSegment?: 'patient' | 'expert' | 'admin';
    templateVariant?: 'default' | 'urgent' | 'reminder' | 'minimal' | 'branded';
  }) {
    recordRenderBreadcrumb({
      workflowId: 'expert-notification',
      eventType: data.notificationType,
      templateName: 'ExpertNotificationTemplate',
      data: data as unknown as Record<string, unknown>,
    });

    const { default: ExpertNotificationTemplate } = await import(
      '@/emails/experts/expert-notification'
    );

    // Narrow `locale` to SupportedLocale before passing to the template.
    const validLocales: SupportedLocale[] = ['en', 'pt', 'es'];
    const locale: SupportedLocale = validLocales.includes(data.locale as SupportedLocale)
      ? (data.locale as SupportedLocale)
      : 'en';

    const template = React.createElement(ExpertNotificationTemplate, {
      expertName: data.expertName,
      notificationTitle: data.notificationType,
      notificationMessage: data.message,
      actionUrl: data.actionUrl,
      actionText: data.actionText,
      locale,
    });

    return render(template);
  }

  /**
   * 🆕 Generic email renderer for any template with fallback
   */
  async renderGenericEmail(data: {
    templateName: string;
    templateData: Record<string, unknown>;
    subject: string;
    userSegment?: 'patient' | 'expert' | 'admin';
    templateVariant?: 'default' | 'urgent' | 'reminder' | 'minimal' | 'branded';
    locale?: string;
  }) {
    const { userSegment = 'patient', templateVariant = 'default', locale = 'en' } = data;

    try {
      // Try to use enhanced template selection
      const selector: TemplateSelector = {
        workflowId: data.templateName,
        eventType: 'default',
        userSegment,
        locale,
        templateVariant,
      };

      const result = await this.renderEmailWithSelection(selector, data.templateData);
      return result.html;
    } catch (error) {
      console.warn(`Failed to render enhanced template for ${data.templateName}:`, error);

      // Fallback to basic HTML template
      return `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>${data.subject}</h2>
          ${Object.entries(data.templateData)
            .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
            .join('')}
        </div>
      `;
    }
  }

  /**
   * Render Multibanco booking pending email with enhanced selection
   */
  async renderMultibancoBookingPending(data: {
    customerName: string;
    expertName: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    timezone: string;
    duration: number;
    multibancoEntity: string;
    multibancoReference: string;
    multibancoAmount: string;
    voucherExpiresAt: string;
    hostedVoucherUrl: string;
    customerNotes?: string;
    locale?: string;
    // Phase 1: forward-compat options — selection path disabled, see comment above.
    userSegment?: 'patient' | 'expert' | 'admin';
    templateVariant?: 'default' | 'urgent' | 'reminder' | 'minimal' | 'branded';
  }) {
    // Strip the forward-compat selection options before passing to the template,
    // so they don't end up as unknown DOM/JSX props. The trailing `void`
    // statements satisfy ESLint's no-unused-vars rule (the project's config
    // does not whitelist the `_` prefix).
    const { userSegment: _userSegment, templateVariant: _templateVariant, ...templateProps } = data;
    void _userSegment;
    void _templateVariant;

    recordRenderBreadcrumb({
      workflowId: 'multibanco-booking-pending',
      eventType: 'default',
      templateName: 'MultibancoBookingPendingTemplate',
      data: templateProps as Record<string, unknown>,
    });

    const template = React.createElement(MultibancoBookingPendingTemplate, templateProps);
    return render(template);
  }

  /**
   * Render reservation expired email using the branded React Email template
   */
  async renderReservationExpired(data: {
    recipientName: string;
    recipientType: 'patient' | 'expert';
    expertName: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    timezone?: string;
    locale?: string;
  }) {
    const validLocales: SupportedLocale[] = ['en', 'pt', 'es'];
    const locale: SupportedLocale = validLocales.includes(data.locale as SupportedLocale)
      ? (data.locale as SupportedLocale)
      : 'en';

    recordRenderBreadcrumb({
      workflowId: 'reservation-expired',
      eventType: 'default',
      templateName: 'ReservationExpiredEmail',
      data: data as unknown as Record<string, unknown>,
    });

    const template = React.createElement(ReservationExpiredEmail, {
      recipientName: data.recipientName,
      recipientType: data.recipientType,
      expertName: data.expertName,
      serviceName: data.serviceName,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      timezone: data.timezone || 'UTC',
      locale,
    });

    return render(template);
  }

  /**
   * Render simple notification email for other workflows
   */
  renderSimpleNotification(data: {
    subject: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    userName?: string;
    locale?: string;
  }) {
    const { title, message, actionUrl, actionText, userName } = data;

    // Create a simple notification template using React createElement
    const template = React.createElement(
      'html',
      null,
      React.createElement(
        'body',
        { style: { fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', padding: '40px' } },
        React.createElement(
          'div',
          {
            style: {
              maxWidth: '600px',
              margin: '0 auto',
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
            },
          },
          React.createElement(
            'h1',
            { style: { color: '#4F46E5', textAlign: 'center', fontSize: '24px' } },
            'Eleva.care',
          ),
          React.createElement(
            'h2',
            { style: { color: '#1f2937', textAlign: 'center', fontSize: '20px' } },
            title,
          ),
          userName &&
            React.createElement(
              'p',
              { style: { color: '#374151', fontSize: '16px' } },
              `Hello ${userName},`,
            ),
          React.createElement('p', { style: { color: '#374151', fontSize: '16px' } }, message),
          actionUrl &&
            actionText &&
            React.createElement(
              'div',
              { style: { textAlign: 'center', margin: '32px 0' } },
              React.createElement(
                'a',
                {
                  href: actionUrl,
                  style: {
                    backgroundColor: '#4F46E5',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                  },
                },
                actionText,
              ),
            ),
          React.createElement('hr', { style: { margin: '24px 0', borderColor: '#d1d5db' } }),
          React.createElement(
            'p',
            { style: { color: '#374151', fontSize: '16px' } },
            'Best regards,',
            React.createElement('br'),
            'The Eleva.care Team',
          ),
          React.createElement('hr', { style: { margin: '24px 0', borderColor: '#d1d5db' } }),
          React.createElement(
            'p',
            { style: { color: '#6b7280', fontSize: '12px', textAlign: 'center' } },
            `© ${new Date().getFullYear()} Eleva.care. All rights reserved.`,
          ),
        ),
      ),
    );

    return render(template);
  }
}

// Create singleton instance
export const elevaEmailService = new ElevaEmailService();
