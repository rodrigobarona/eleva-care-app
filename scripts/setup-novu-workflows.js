#!/usr/bin/env node
/**
 * Multilingual Novu Framework Workflow Setup Script
 *
 * Creates and configures notification workflows using the new @novu/framework
 * with next-intl for multilingual support
 *
 * Run with: node -r dotenv/config scripts/setup-novu-workflows.mjs
 * or: npm run setup:novu-workflows
 *
 * This script generates workflow definitions for the Novu Framework
 * Note: These variables are defined in config/env.ts for centralized access
 */
import fs from 'fs';
import path from 'path';

// Check environment variables
const NOVU_SECRET_KEY = process.env.NOVU_SECRET_KEY;
const NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER;

if (!NOVU_SECRET_KEY) {
  console.error('❌ Missing required environment variable: NOVU_SECRET_KEY');
  process.exit(1);
}

if (!NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER) {
  console.error(
    '❌ Missing required environment variable: NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER',
  );
  process.exit(1);
}

console.log('🌐 Setting up multilingual Novu Framework workflows for Eleva Care...\n');

// Define supported locales
const supportedLocales = ['en', 'pt', 'es', 'br'];

// Load translations for all locales
const translations = {};
for (const locale of supportedLocales) {
  try {
    const messagePath = path.join(process.cwd(), `messages/${locale}.json`);
    if (fs.existsSync(messagePath)) {
      translations[locale] = JSON.parse(fs.readFileSync(messagePath, 'utf8'));
      console.log(`✅ Loaded translations for ${locale}`);
    } else {
      console.warn(`⚠️  Translation file not found for ${locale}`);
    }
  } catch (error) {
    console.error(`❌ Error loading translations for ${locale}:`, error.message);
  }
}

console.log();

// Helper function to get translated message
function getTranslation(locale, path, defaultValue = '') {
  const keys = path.split('.');
  let current = translations[locale];

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      // Fallback to English if translation not found
      if (locale !== 'en' && translations['en']) {
        return getTranslation('en', path, defaultValue);
      }
      return defaultValue;
    }
  }

  return current || defaultValue;
}

// Helper function to create email template
function createEmailTemplate(locale, templateType, _payload = {}) {
  const t = (path, defaultValue = '') => getTranslation(locale, path, defaultValue);

  const templates = {
    welcome: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>${t('notifications.welcome.email.title', 'Welcome to Eleva Care!')}</h1>
        </div>
        <div style="padding: 20px;">
          <p>${t('notifications.welcome.email.greeting', 'Hi {firstName},')}${'{{payload.firstName}}'}</p>
          <p>${t('notifications.welcome.email.body', "Thank you for joining our healthcare platform. We're excited to help you on your wellness journey.")}</p>
          <h3>${t('notifications.welcome.email.nextStepsTitle', 'Next Steps:')}</h3>
          <ul>
            ${t('notifications.welcome.email.nextSteps', [])
              .map((step) => `<li>${step}</li>`)
              .join('')}
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.profileUrl}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              ${t('notifications.welcome.email.cta', 'Complete Your Profile')}
            </a>
          </div>
          <p>Best regards,<br>The Eleva Care Team</p>
        </div>
      </div>
    `,

    paymentSuccess: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
          <h1>Payment Confirmation</h1>
        </div>
        <div style="padding: 20px;">
          <p>Your payment has been successfully processed.</p>
          <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3>Payment Details:</h3>
            <p><strong>Amount:</strong> {{payload.amount}}</p>
            <p><strong>Plan:</strong> {{payload.planName}}</p>
            <p><strong>Date:</strong> {{payload.paymentDate}}</p>
            <p><strong>Transaction ID:</strong> {{payload.transactionId}}</p>
          </div>
          <p>Thank you for your payment!</p>
        </div>
      </div>
    `,

    appointmentReminder: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>${t('notifications.appointmentReminder.email.title', 'Appointment Reminder')}</h1>
        </div>
        <div style="padding: 20px;">
          <p>${t('notifications.appointmentReminder.email.greeting', 'Hi {userName},')}${'{{payload.userName}}'}</p>
          <p>${t('notifications.appointmentReminder.email.body', 'This is a friendly reminder that your {appointmentType} with {expertName} is {timeUntilAppointment}, on {appointmentDate} at {appointmentTime}.')}</p>
          <div style="background-color: #e8f5f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3>Appointment Details:</h3>
            <p><strong>Expert:</strong> {{payload.expertName}}</p>
            <p><strong>Date:</strong> {{payload.appointmentDate}}</p>
            <p><strong>Time:</strong> {{payload.appointmentTime}}</p>
            <p><strong>Type:</strong> {{payload.appointmentType}}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.meetingLink}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              ${t('notifications.appointmentReminder.email.cta', 'Join your meeting')}
            </a>
          </div>
          <p><small>${t('notifications.appointmentReminder.email.footer', 'Please ensure you are in a quiet place with a stable internet connection.')}</small></p>
        </div>
      </div>
    `,

    expertOnboarding: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>${t('notifications.expertOnboardingComplete.email.title', 'Congratulations, {expertName}!')}</h1>
        </div>
        <div style="padding: 20px;">
          <p>${t('notifications.expertOnboardingComplete.email.body', 'Your expert profile is now active on Eleva Care.')}</p>
          <p><strong>${t('notifications.expertOnboardingComplete.email.specialization', 'Specialization: {specialization}')}</strong></p>
          <h3>${t('notifications.expertOnboardingComplete.email.nextStepsTitle', 'You can now:')}</h3>
          <ul>
            ${t('notifications.expertOnboardingComplete.email.nextSteps', [])
              .map((step) => `<li>${step}</li>`)
              .join('')}
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.dashboardUrl}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              ${t('notifications.expertOnboardingComplete.email.cta', 'Go to Dashboard')}
            </a>
          </div>
        </div>
      </div>
    `,

    healthCheckFailure: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1>⚠️ Health Check Failure Alert</h1>
        </div>
        <div style="padding: 20px;">
          <p>A health check failure has been detected in the Eleva Care application.</p>
          <h3>System Details</h3>
          <ul>
            <li><strong>Status:</strong> {{payload.status}}</li>
            <li><strong>Error:</strong> {{payload.error}}</li>
            <li><strong>Environment:</strong> {{payload.environment}}</li>
            <li><strong>Timestamp:</strong> {{payload.timestamp}}</li>
            <li><strong>Version:</strong> {{payload.version}}</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.monitoringUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Monitoring Dashboard</a>
          </div>
        </div>
      </div>
    `,
  };

  return templates[templateType] || '';
}

// Generate workflow definitions for each locale
function generateWorkflowsForLocale(locale) {
  const t = (path, defaultValue = '') => getTranslation(locale, path, defaultValue);

  return `
/**
 * ${locale.toUpperCase()} - Welcome Workflow - Onboards new users to Eleva Care
 */
export const welcomeWorkflow${locale.toUpperCase()} = workflow(
  'user-welcome-${locale}',
  async ({ step, payload }) => {
    // In-app notification
    await step.inApp('welcome-message', async () => ({
      subject: '${t('notifications.welcome.subject', 'Welcome to Eleva Care, {userName}!')}',
      body: \`${t('notifications.welcome.body', "Hi {userName}! Welcome to Eleva Care. We're excited to help you on your healthcare journey.")}\`,
      avatar: 'https://eleva.care/logo.png',
      primaryAction: {
        label: '${t('notifications.welcome.email.cta', 'Complete Your Profile')}',
        redirect: {
          url: payload.profileUrl,
          target: '_self',
        },
      },
    }));

    // Welcome email
    await step.email('welcome-email', async () => ({
      subject: '${t('notifications.welcome.email.subject', 'Welcome to Eleva Care!')}',
      body: \`${createEmailTemplate(locale, 'welcome')}\`,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      firstName: z.string(),
      profileUrl: z.string().url().default('/profile'),
    }),
    name: 'Welcome Workflow (${locale.toUpperCase()})',
    description: 'Welcome new users to Eleva Care platform',
    tags: ['user-onboarding', 'welcome', '${locale}'],
    preferences: {
      all: { enabled: true, readOnly: false },
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * ${locale.toUpperCase()} - Payment Success Workflow - Confirms successful payments
 */
export const paymentSuccessWorkflow${locale.toUpperCase()} = workflow(
  'payment-success-${locale}',
  async ({ step, payload }) => {
    // In-app confirmation
    await step.inApp('payment-confirmation', async () => ({
      subject: '${t('notifications.paymentSuccess.subject', 'Payment successful!')}',
      body: \`${t('notifications.paymentSuccess.body', 'Your payment of {amount} for {planName} has been processed successfully.')}\`,
    }));

    // Email receipt
    await step.email('payment-receipt', async () => ({
      subject: \`Payment Confirmation - \${payload.amount}\`,
      body: \`${createEmailTemplate(locale, 'paymentSuccess')}\`,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      planName: z.string(),
      paymentDate: z.string(),
      transactionId: z.string(),
    }),
    name: 'Payment Success Workflow (${locale.toUpperCase()})',
    description: 'Confirm successful payments to users',
    tags: ['payments', 'confirmation', '${locale}'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * ${locale.toUpperCase()} - Payment Failed Workflow - Alerts users of failed payments
 */
export const paymentFailedWorkflow${locale.toUpperCase()} = workflow(
  'payment-failed-${locale}',
  async ({ step, payload }) => {
    // In-app alert
    await step.inApp('payment-failure', async () => ({
      subject: '${t('notifications.paymentFailed.subject', 'Payment failed')}',
      body: \`${t('notifications.paymentFailed.body', "We couldn't process your payment of {amount}. Please check your payment method and try again.")}\`,
      primaryAction: {
        label: 'Update Payment Method',
        redirect: {
          url: payload.billingUrl,
          target: '_self',
        },
      },
    }));

    // Email alert
    await step.email('payment-failure-email', async () => ({
      subject: 'Payment Failed - Action Required',
      body: \`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1>Payment Failed</h1>
          </div>
          <div style="padding: 20px;">
            <p>We were unable to process your payment of \${payload.amount}.</p>
            <p><strong>Reason:</strong> \${payload.reason}</p>
            <p>Please update your payment method and try again.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="\${payload.billingUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method</a>
            </div>
          </div>
        </div>
      \`,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      reason: z.string(),
      billingUrl: z.string().url().default('/billing'),
    }),
    name: 'Payment Failed Workflow (${locale.toUpperCase()})',
    description: 'Alert users of failed payments',
    tags: ['payments', 'alerts', '${locale}'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * ${locale.toUpperCase()} - Appointment Reminder Workflow - 24-hour appointment reminders
 */
export const appointmentReminderWorkflow${locale.toUpperCase()} = workflow(
  'appointment-reminder-24hr-${locale}',
  async ({ step, payload }) => {
    // In-app reminder
    await step.inApp('appointment-reminder-notification', async () => ({
      subject: '${t('notifications.appointmentReminder.subject', 'Reminder: Your appointment is {timeUntilAppointment}')}',
      body: \`${t('notifications.appointmentReminder.body', 'Your {appointmentType} with {expertName} is {timeUntilAppointment} on {appointmentDate} at {appointmentTime}.')}\`,
      primaryAction: {
        label: '${t('notifications.appointmentReminder.email.cta', 'Join Meeting')}',
        redirect: {
          url: payload.meetingLink,
          target: '_blank',
        },
      },
    }));

    // Email reminder
    await step.email('appointment-reminder-email', async () => ({
      subject: \`${t('notifications.appointmentReminder.email.subject', 'Reminder: Your Eleva Care Appointment is {timeUntilAppointment}')}\`,
      body: \`${createEmailTemplate(locale, 'appointmentReminder')}\`,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      expertName: z.string(),
      appointmentType: z.string(),
      timeUntilAppointment: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      meetingLink: z.string().url(),
    }),
    name: 'Appointment Reminder Workflow (${locale.toUpperCase()})',
    description: '24-hour appointment reminders',
    tags: ['appointments', 'reminders', '${locale}'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * ${locale.toUpperCase()} - Expert Onboarding Complete Workflow - Welcome experts when approved
 */
export const expertOnboardingCompleteWorkflow${locale.toUpperCase()} = workflow(
  'expert-onboarding-complete-${locale}',
  async ({ step, payload }) => {
    // In-app notification
    await step.inApp('onboarding-complete', async () => ({
      subject: '${t('notifications.expertOnboardingComplete.subject', 'Expert setup complete!')}',
      body: \`${t('notifications.expertOnboardingComplete.body', 'Congratulations {expertName}! Your expert profile is now live. You can start receiving bookings from clients.')}\`,
      primaryAction: {
        label: '${t('notifications.expertOnboardingComplete.email.cta', 'Go to Dashboard')}',
        redirect: {
          url: payload.dashboardUrl,
          target: '_self',
        },
      },
    }));

    // Welcome email
    await step.email('expert-welcome-email', async () => ({
      subject: '${t('notifications.expertOnboardingComplete.email.subject', 'Welcome to the Eleva Care Expert Network!')}',
      body: \`${createEmailTemplate(locale, 'expertOnboarding')}\`,
    }));
  },
  {
    payloadSchema: z.object({
      expertName: z.string(),
      specialization: z.string(),
      dashboardUrl: z.string().url().default('/dashboard'),
    }),
    name: 'Expert Onboarding Complete Workflow (${locale.toUpperCase()})',
    description: 'Welcome experts when their profile is approved',
    tags: ['experts', 'onboarding', '${locale}'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * ${locale.toUpperCase()} - Health Check Failure Workflow - Alert administrators of system health issues
 */
export const healthCheckFailureWorkflow${locale.toUpperCase()} = workflow(
  'health-check-failure-${locale}',
  async ({ step, payload }) => {
    // In-app alert for admins
    await step.inApp('health-check-alert', async () => ({
      subject: '⚠️ Health Check Failure',
      body: \`⚠️ Health Check Failure: \${payload.environment} - \${payload.status}. Error: \${payload.error}\`,
    }));

    // Email alert for admins
    await step.email('health-check-alert-email', async () => ({
      subject: \`⚠️ Eleva Care Health Check Failure - \${payload.environment}\`,
      body: \`${createEmailTemplate(locale, 'healthCheckFailure')}\`,
    }));
  },
  {
    payloadSchema: z.object({
      status: z.string(),
      error: z.string(),
      environment: z.string(),
      timestamp: z.string(),
      version: z.string(),
      memory: z.object({
        used: z.number(),
        total: z.number(),
        percentage: z.number(),
      }),
      monitoringUrl: z.string().url().default('/admin/monitoring'),
    }),
    name: 'Health Check Failure Workflow (${locale.toUpperCase()})',
    description: 'Alert administrators of system health issues',
    tags: ['system', 'alerts', 'monitoring', '${locale}'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);`;
}

// Generate complete workflows file
const workflowsDir = path.join(process.cwd(), 'config/novu');

// Ensure workflows directory exists
if (!fs.existsSync(workflowsDir)) {
  fs.mkdirSync(workflowsDir, { recursive: true });
  console.log('📁 Created workflows directory:', workflowsDir);
}

// Generate workflows content with all locales
let workflowsContent = `import { workflow } from '@novu/framework';
import { z } from 'zod';

/**
 * Multilingual Novu Workflows for Eleva Care
 * Generated with next-intl translations
 * 
 * Supported languages: ${supportedLocales.join(', ')}
 */
`;

// Add workflow definitions for each locale
const allWorkflows = [];
for (const locale of supportedLocales) {
  if (translations[locale]) {
    console.log(`🌐 Generating workflows for ${locale}...`);
    workflowsContent += generateWorkflowsForLocale(locale);

    // Add workflow names to export array
    allWorkflows.push(
      `welcomeWorkflow${locale.toUpperCase()}`,
      `paymentSuccessWorkflow${locale.toUpperCase()}`,
      `paymentFailedWorkflow${locale.toUpperCase()}`,
      `appointmentReminderWorkflow${locale.toUpperCase()}`,
      `expertOnboardingCompleteWorkflow${locale.toUpperCase()}`,
      `healthCheckFailureWorkflow${locale.toUpperCase()}`,
    );
  }
}

// Add export array
workflowsContent += `

// Export all workflows grouped by locale
export const workflowsByLocale = {
${supportedLocales
  .map((locale) => {
    if (translations[locale]) {
      return `  ${locale}: [
    welcomeWorkflow${locale.toUpperCase()},
    paymentSuccessWorkflow${locale.toUpperCase()},
    paymentFailedWorkflow${locale.toUpperCase()},
    appointmentReminderWorkflow${locale.toUpperCase()},
    expertOnboardingCompleteWorkflow${locale.toUpperCase()},
    healthCheckFailureWorkflow${locale.toUpperCase()},
  ]`;
    }
    return '';
  })
  .filter(Boolean)
  .join(',\n')}
};

// Export all workflows in a single array for easy import
export const workflows = [
  ${allWorkflows.join(',\n  ')}
];

// Helper function to get workflows for a specific locale
export function getWorkflowsForLocale(locale: string) {
  return workflowsByLocale[locale] || workflowsByLocale['en'] || [];
}

// Helper function to get workflow ID with locale suffix
export function getLocalizedWorkflowId(baseId: string, locale: string = 'en') {
  return \`\${baseId}-\${locale}\`;
}
`;

// Write the workflows file
const workflowsFilePath = path.join(workflowsDir, 'workflows.ts');
fs.writeFileSync(workflowsFilePath, workflowsContent);
console.log('✅ Created multilingual workflows file:', workflowsFilePath);

// Create an index file for easy imports
const indexContent = `export * from './workflows';
`;

const indexFilePath = path.join(workflowsDir, 'index.ts');
fs.writeFileSync(indexFilePath, indexContent);
console.log('✅ Created index file:', indexFilePath);

// Update the main config/novu.ts file to use the new Framework approach
const configNovuPath = path.join(process.cwd(), 'config/novu.ts');
const configNovuContent = `import { workflows, workflowsByLocale, getWorkflowsForLocale, getLocalizedWorkflowId } from './novu';

// Export workflows for the Novu Framework
export { workflows, workflowsByLocale, getWorkflowsForLocale, getLocalizedWorkflowId };
`;

fs.writeFileSync(configNovuPath, configNovuContent);
console.log('✅ Updated config/novu.ts');

// Create documentation
const docContent = `# Multilingual Novu Framework Workflows

This document describes the multilingual Novu Framework workflows configured for Eleva Care using next-intl.

## Supported Languages

- **English (en)**: Primary language
- **Portuguese (pt)**: Portugal Portuguese
- **Spanish (es)**: Spanish
- **Brazilian Portuguese (br)**: Brazilian Portuguese

## Workflow Structure

Each workflow is created for every supported language with locale-specific IDs:

### 1. Welcome Workflow (\`user-welcome-{locale}\`)
- **Purpose**: Onboard new users to the platform
- **Triggers**: User registration
- **Channels**: In-app + Email
- **Locales**: \`en\`, \`pt\`, \`es\`, \`br\`

### 2. Payment Success Workflow (\`payment-success-{locale}\`)
- **Purpose**: Confirm successful payments
- **Triggers**: Payment completion
- **Channels**: In-app + Email
- **Locales**: \`en\`, \`pt\`, \`es\`, \`br\`

### 3. Payment Failed Workflow (\`payment-failed-{locale}\`)
- **Purpose**: Alert users of failed payments
- **Triggers**: Payment failure
- **Channels**: In-app + Email
- **Locales**: \`en\`, \`pt\`, \`es\`, \`br\`

### 4. Appointment Reminder Workflow (\`appointment-reminder-24hr-{locale}\`)
- **Purpose**: 24-hour appointment reminders
- **Triggers**: Scheduled 24 hours before appointment
- **Channels**: In-app + Email
- **Locales**: \`en\`, \`pt\`, \`es\`, \`br\`

### 5. Expert Onboarding Complete Workflow (\`expert-onboarding-complete-{locale}\`)
- **Purpose**: Welcome experts when profile is approved
- **Triggers**: Expert profile approval
- **Channels**: In-app + Email
- **Locales**: \`en\`, \`pt\`, \`es\`, \`br\`

### 6. Health Check Failure Workflow (\`health-check-failure-{locale}\`)
- **Purpose**: Alert administrators of system health issues
- **Triggers**: Health check failure
- **Channels**: In-app + Email
- **Locales**: \`en\`, \`pt\`, \`es\`, \`br\`

## Usage

### Triggering Localized Workflows

\`\`\`typescript
import { Novu } from '@novu/api';
import { getLocalizedWorkflowId } from '@/config/novu';

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY,
});

// Trigger welcome workflow for Portuguese user
await novu.trigger({
  workflowId: getLocalizedWorkflowId('user-welcome', 'pt'),
  to: {
    subscriberId: 'user_123',
    firstName: 'João',
    email: 'joao@example.com',
  },
  payload: {
    userName: 'João Silva',
    firstName: 'João',
    profileUrl: '/profile',
  },
});
\`\`\`

### Getting Workflows by Locale

\`\`\`typescript
import { getWorkflowsForLocale } from '@/config/novu';

// Get all Portuguese workflows
const ptWorkflows = getWorkflowsForLocale('pt');

// Get workflows with fallback to English
const userWorkflows = getWorkflowsForLocale(userLocale);
\`\`\`

## Translation System

The workflows use translations from the \`messages/\` directory:

\`\`\`
messages/
  ├── en.json     # English (primary)
  ├── pt.json     # Portuguese (Portugal)
  ├── es.json     # Spanish
  └── br.json     # Brazilian Portuguese
\`\`\`

### Translation Structure

\`\`\`json
{
  "notifications": {
    "welcome": {
      "subject": "Welcome to Eleva Care, {userName}!",
      "body": "Hi {userName}! Welcome to Eleva Care...",
      "email": {
        "subject": "Welcome to Eleva Care!",
        "title": "Welcome to Eleva Care!",
        "greeting": "Hi {firstName},",
        "body": "Thank you for joining our healthcare platform...",
        "nextStepsTitle": "Next Steps:",
        "nextSteps": [
          "Complete your profile",
          "Browse available experts",
          "Book your first consultation"
        ],
        "cta": "Complete Your Profile"
      }
    }
  }
}
\`\`\`

## Workflow Deployment

The workflows are automatically deployed when you sync with Novu Cloud:

\`\`\`bash
npx novu@latest sync \\
  --bridge-url https://your-domain.com/api/novu \\
  --secret-key YOUR_NOVU_SECRET_KEY
\`\`\`

## File Structure

\`\`\`
config/
  novu/
    workflows.ts    # Multilingual workflow definitions
    index.ts        # Export file
  novu.ts          # Configuration exports
app/
  api/
    novu/
      route.ts      # Next.js API route
messages/            # Translation files
  en.json
  pt.json
  es.json
  br.json
\`\`\`

## Development

To test workflows locally:

1. Start your development server
2. Run Novu Studio: \`npx novu@latest dev\`
3. Test workflows in the Studio interface
4. Workflows will be available with locale suffixes

## Adding New Languages

1. Create new translation file in \`messages/{locale}.json\`
2. Add locale to \`supportedLocales\` array in setup script
3. Run setup script: \`npm run setup:novu-workflows\`
4. Sync workflows: \`npm run sync:novu\`

## Production

Before deploying to production:

1. Ensure all translation files are complete
2. Set environment variables for all locales
3. Sync workflows: \`npm run sync:novu\`
4. Configure email providers in Novu Dashboard
5. Test with different locale users
`;

const docPath = path.join(
  process.cwd(),
  'docs/02-core-systems/notifications/07-multilingual-novu-workflows.md',
);
fs.writeFileSync(docPath, docContent);
console.log('✅ Created multilingual documentation:', docPath);

console.log('\n🎉 Multilingual Novu Framework workflows created successfully!');
console.log('\n📂 Files created:');
console.log('  - config/novu/workflows.ts (multilingual)');
console.log('  - config/novu/index.ts (updated)');
console.log('  - config/novu.ts (updated)');
console.log('  - docs/02-core-systems/notifications/07-multilingual-novu-workflows.md');

console.log('\n🌐 Languages supported:');
supportedLocales.forEach((locale) => {
  const hasTranslations = translations[locale] ? '✅' : '❌';
  console.log(`  - ${locale.toUpperCase()}: ${hasTranslations}`);
});

console.log('\n🔗 Next steps:');
console.log('1. Install Zod (if not installed): npm install zod');
console.log('2. Install Novu Framework: npm install @novu/framework');
console.log('3. Start your dev server: npm run dev');
console.log('4. Test with Novu Studio: npx novu@latest dev');
console.log('5. Sync to cloud: npm run sync:novu');

console.log('\n📧 Configure your email provider:');
console.log('https://web.novu.co/integrations');

console.log(`\n✨ Ready to use ${allWorkflows.length} multilingual workflows!`);
