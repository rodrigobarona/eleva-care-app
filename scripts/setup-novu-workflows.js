#!/usr/bin/env node

/**
 * Novu Workflow Setup Script
 *
 * Creates and configures notification workflows and templates for Eleva Care
 * Run with: node -r dotenv/config scripts/setup-novu-workflows.js
 * or: npm run setup:novu-workflows
 * Note: These variables are defined in config/env.ts for centralized access
 */

const fs = require('fs');
const path = require('path');

// Novu API configuration (also defined in config/env.ts)
const NOVU_SECRET_KEY = process.env.NOVU_SECRET_KEY;
const NOVU_API_KEY = process.env.NOVU_API_KEY;
const NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER;
const NOVU_BASE_URL = process.env.NOVU_BASE_URL || 'https://eu.api.novu.co';

if (!NOVU_SECRET_KEY && !NOVU_API_KEY) {
  console.error('❌ Missing required environment variables: NOVU_SECRET_KEY or NOVU_API_KEY');
  process.exit(1);
}

if (!NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER) {
  console.error(
    '❌ Missing required environment variable: NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER',
  );
  process.exit(1);
}

const apiKey = NOVU_SECRET_KEY || NOVU_API_KEY;

// API helper function
async function novuAPI(endpoint, method = 'GET', data = null) {
  const url = `${NOVU_BASE_URL}/v1/${endpoint}`;

  const options = {
    method,
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Novu API error: ${response.status} ${response.statusText}\n${errorBody}`);
  }

  return response.json();
}

// Workflow configurations based on config/novu.ts
const workflowConfigs = [
  {
    name: 'Welcome Workflow',
    identifier: 'user-welcome',
    description: 'Welcome new users to Eleva Care platform',
    tags: ['user-onboarding', 'welcome'],
    critical: true,
    steps: [
      {
        type: 'in_app',
        name: 'welcome-message',
        template: {
          content:
            "Welcome to Eleva Care, {{userName}}! We're excited to help you on your healthcare journey.",
          cta: {
            type: 'redirect',
            data: {
              url: '/profile',
            },
            action: {
              label: 'Complete Your Profile',
            },
          },
        },
      },
      {
        type: 'email',
        name: 'welcome-email',
        template: {
          subject: 'Welcome to Eleva Care!',
          content: `
            <h2>Welcome to Eleva Care!</h2>
            <p>Hi {{firstName}},</p>
            <p>Thank you for joining our healthcare platform. We're excited to help you on your wellness journey.</p>
            <h3>Next Steps:</h3>
            <ul>
              <li>Complete your profile</li>
              <li>Browse available experts</li>
              <li>Book your first consultation</li>
            </ul>
            <a href="{{profileUrl}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Complete Your Profile</a>
          `,
        },
      },
    ],
  },
  {
    name: 'Payment Success Workflow',
    identifier: 'payment-success',
    description: 'Confirm successful payments to users',
    tags: ['payments', 'confirmation'],
    critical: true,
    steps: [
      {
        type: 'in_app',
        name: 'payment-confirmation',
        template: {
          content: 'Payment successful! Your {{planName}} for {{amount}} has been processed.',
        },
      },
      {
        type: 'email',
        name: 'payment-receipt',
        template: {
          subject: 'Payment Confirmation - {{amount}}',
          content: `
            <h2>Payment Confirmation</h2>
            <p>Your payment has been successfully processed.</p>
            <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3>Payment Details:</h3>
              <p><strong>Amount:</strong> {{amount}}</p>
              <p><strong>Plan:</strong> {{planName}}</p>
              <p><strong>Date:</strong> {{paymentDate}}</p>
              <p><strong>Transaction ID:</strong> {{transactionId}}</p>
            </div>
            <p>Thank you for your payment!</p>
          `,
        },
      },
    ],
  },
  {
    name: 'Payment Failed Workflow',
    identifier: 'payment-failed',
    description: 'Alert users of failed payments',
    tags: ['payments', 'alerts'],
    critical: true,
    steps: [
      {
        type: 'in_app',
        name: 'payment-failure',
        template: {
          content: 'Payment failed for {{amount}}. Please check your payment method and try again.',
          cta: {
            type: 'redirect',
            data: {
              url: '/billing',
            },
            action: {
              label: 'Update Payment Method',
            },
          },
        },
      },
      {
        type: 'email',
        name: 'payment-failure-email',
        template: {
          subject: 'Payment Failed - Action Required',
          content: `
            <h2>Payment Failed</h2>
            <p>We were unable to process your payment of {{amount}}.</p>
            <p><strong>Reason:</strong> {{reason}}</p>
            <p>Please update your payment method and try again.</p>
            <a href="{{billingUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Update Payment Method</a>
          `,
        },
      },
    ],
  },
  {
    name: 'Appointment Reminder Workflow',
    identifier: 'appointment-reminder-24hr',
    description: '24-hour appointment reminders',
    tags: ['appointments', 'reminders'],
    critical: true,
    steps: [
      {
        type: 'in_app',
        name: 'appointment-reminder-notification',
        template: {
          content:
            'Reminder: Your {{appointmentType}} with {{expertName}} is {{timeUntilAppointment}}.',
          cta: {
            type: 'redirect',
            data: {
              url: '{{meetingLink}}',
            },
            action: {
              label: 'Join Meeting',
            },
          },
        },
      },
      {
        type: 'email',
        name: 'appointment-reminder-email',
        template: {
          subject: 'Reminder: Your Eleva Care Appointment is {{timeUntilAppointment}}',
          content: `
            <h2>Appointment Reminder</h2>
            <p>Hi {{userName}},</p>
            <p>This is a friendly reminder that your {{appointmentType}} with {{expertName}} is {{timeUntilAppointment}}.</p>
            <div style="background-color: #e8f5f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3>Appointment Details:</h3>
              <p><strong>Expert:</strong> {{expertName}}</p>
              <p><strong>Date:</strong> {{appointmentDate}}</p>
              <p><strong>Time:</strong> {{appointmentTime}}</p>
              <p><strong>Type:</strong> {{appointmentType}}</p>
            </div>
            <a href="{{meetingLink}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Join your meeting</a>
            <p><small>Please ensure you are in a quiet place with a stable internet connection.</small></p>
          `,
        },
      },
    ],
  },
  {
    name: 'Expert Onboarding Complete Workflow',
    identifier: 'expert-onboarding-complete',
    description: 'Welcome experts when their profile is approved',
    tags: ['experts', 'onboarding'],
    critical: true,
    steps: [
      {
        type: 'in_app',
        name: 'onboarding-complete',
        template: {
          content:
            'Congratulations {{expertName}}! Your expert profile is now live. You can start receiving bookings from clients.',
          cta: {
            type: 'redirect',
            data: {
              url: '/dashboard',
            },
            action: {
              label: 'Go to Dashboard',
            },
          },
        },
      },
      {
        type: 'email',
        name: 'expert-welcome-email',
        template: {
          subject: 'Welcome to the Eleva Care Expert Network!',
          content: `
            <h2>Congratulations, {{expertName}}!</h2>
            <p>Your expert profile is now active on Eleva Care.</p>
            <p><strong>Specialization:</strong> {{specialization}}</p>
            <h3>You can now:</h3>
            <ul>
              <li>Receive client bookings</li>
              <li>Manage your availability</li>
              <li>Track your earnings</li>
              <li>Build your client base</li>
            </ul>
            <a href="{{dashboardUrl}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Go to Dashboard</a>
          `,
        },
      },
    ],
  },
  {
    name: 'Health Check Failure Workflow',
    identifier: 'health-check-failure',
    description: 'Alert administrators of system health issues',
    tags: ['system', 'alerts', 'monitoring'],
    critical: true,
    steps: [
      {
        type: 'in_app',
        name: 'health-check-alert',
        template: {
          content: '⚠️ Health Check Failure: {{environment}} - {{status}}. Error: {{error}}',
        },
      },
      {
        type: 'email',
        name: 'health-check-alert-email',
        template: {
          subject: '⚠️ Eleva Care Health Check Failure - {{environment}}',
          content: `
            <h2>⚠️ Health Check Failure Alert</h2>
            <p>A health check failure has been detected in the Eleva Care application.</p>
            <h3>System Details</h3>
            <ul>
              <li><strong>Status:</strong> {{status}}</li>
              <li><strong>Error:</strong> {{error}}</li>
              <li><strong>Environment:</strong> {{environment}}</li>
              <li><strong>Timestamp:</strong> {{timestamp}}</li>
              <li><strong>Version:</strong> {{version}}</li>
            </ul>
            <h3>Memory Usage</h3>
            <ul>
              <li><strong>Used:</strong> {{memory.used}}MB</li>
              <li><strong>Total:</strong> {{memory.total}}MB</li>
              <li><strong>Usage:</strong> {{memory.percentage}}%</li>
            </ul>
            <a href="{{config.baseUrl}}/admin/monitoring" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Monitoring Dashboard</a>
          `,
        },
      },
    ],
  },
];

// Get default notification group
async function getDefaultNotificationGroupId() {
  try {
    const groups = await novuAPI('notification-groups');
    if (groups.data && groups.data.length > 0) {
      // Use the first available group or find one named "General"
      const defaultGroup = groups.data.find((g) => g.name === 'General') || groups.data[0];
      return defaultGroup._id;
    }

    // Create a default group if none exists
    const newGroup = await novuAPI('notification-groups', 'POST', {
      name: 'General',
    });
    return newGroup.data._id;
  } catch (error) {
    console.error('Error getting notification group:', error.message);
    throw error;
  }
}

// Create notification template
async function createNotificationTemplate(workflowConfig, notificationGroupId) {
  console.log(`📧 Creating notification template: ${workflowConfig.name}`);

  try {
    // First, check if workflow already exists
    const existingWorkflows = await novuAPI('notification-templates');
    const existingWorkflow = existingWorkflows.data?.find(
      (w) => w.triggers?.[0]?.identifier === workflowConfig.identifier,
    );

    if (existingWorkflow) {
      console.log(
        `  ⚠️  Workflow ${workflowConfig.identifier} already exists (ID: ${existingWorkflow._id})`,
      );
      console.log(`  🔄 Updating existing workflow...`);

      // Update existing workflow
      const updated = await novuAPI(`notification-templates/${existingWorkflow._id}`, 'PUT', {
        name: workflowConfig.name,
        description: workflowConfig.description,
        tags: workflowConfig.tags,
        critical: workflowConfig.critical,
      });

      console.log(`  ✅ Updated workflow: ${workflowConfig.identifier}\n`);
      return updated.data;
    }

    // Create new workflow
    const steps = workflowConfig.steps.map((step, index) => ({
      template: {
        type: step.type,
        name: step.name,
        content: step.template.content || step.template.subject,
        ...(step.template.subject && { subject: step.template.subject }),
        ...(step.template.cta && { cta: step.template.cta }),
      },
      filters: [],
      _id: `step_${index}`,
    }));

    const templateData = {
      name: workflowConfig.name,
      description: workflowConfig.description,
      tags: workflowConfig.tags,
      notificationGroupId: notificationGroupId,
      steps,
      active: true,
      draft: false,
      critical: workflowConfig.critical || false,
      triggers: [
        {
          type: 'event',
          identifier: workflowConfig.identifier,
          variables: [],
        },
      ],
    };

    const result = await novuAPI('notification-templates', 'POST', templateData);
    console.log(`  ✅ Created workflow: ${workflowConfig.identifier} (ID: ${result.data._id})\n`);
    return result.data;
  } catch (error) {
    console.error(`  ❌ Error creating workflow "${workflowConfig.identifier}":`, error.message);
    throw error;
  }
}

// Setup admin subscriber
async function setupAdminSubscriber() {
  console.log('👤 Setting up admin subscriber...');

  const adminSubscriberId = process.env.NOVU_ADMIN_SUBSCRIBER_ID || 'admin';

  try {
    // Check if admin subscriber exists
    let adminSubscriber;
    try {
      const response = await novuAPI(`subscribers/${adminSubscriberId}`);
      adminSubscriber = response.data;
      console.log(`  ✅ Admin subscriber exists: ${adminSubscriberId}`);
    } catch (error) {
      // Subscriber doesn't exist, create it
      if (error.message.includes('404')) {
        const subscriberData = {
          subscriberId: adminSubscriberId,
          email: 'admin@eleva.care',
          firstName: 'Admin',
          lastName: 'User',
          data: {
            role: 'admin',
            notificationPreferences: {
              healthChecks: true,
              systemAlerts: true,
              criticalErrors: true,
            },
          },
        };

        adminSubscriber = await novuAPI('subscribers', 'POST', subscriberData);
        console.log(`  ✅ Created admin subscriber: ${adminSubscriberId}`);
      } else {
        throw error;
      }
    }

    // Set up admin preferences for critical notifications
    const preferences = await novuAPI(`subscribers/${adminSubscriberId}/preferences`);
    console.log(
      `  📊 Admin has ${preferences.data?.length || 0} notification preferences configured`,
    );

    console.log();
    return adminSubscriber;
  } catch (error) {
    console.error('  ❌ Error setting up admin subscriber:', error.message);
    throw error;
  }
}

// Main setup function
async function setupNovuWorkflows() {
  console.log('🚀 Setting up Novu workflows for Eleva Care...\n');

  try {
    // Setup admin subscriber first
    await setupAdminSubscriber();

    const createdWorkflows = [];

    // Get default notification group
    const notificationGroupId = await getDefaultNotificationGroupId();

    // Create all workflow templates
    for (const workflowConfig of workflowConfigs) {
      const workflow = await createNotificationTemplate(workflowConfig, notificationGroupId);
      createdWorkflows.push({
        name: workflowConfig.name,
        identifier: workflowConfig.identifier,
        id: workflow._id,
        critical: workflowConfig.critical,
      });
    }

    console.log('🎉 All Novu workflows created successfully!\n');
    console.log('Created workflows:');
    createdWorkflows.forEach((w) => {
      const criticalFlag = w.critical ? ' 🔴' : '';
      console.log(`  - ${w.name}: ${w.identifier}${criticalFlag}`);
    });

    // Save workflow configurations to a file
    const workflowsList = createdWorkflows.map((w) => ({
      name: w.name,
      identifier: w.identifier,
      id: w.id,
      critical: w.critical,
      dashboardUrl: `https://web.novu.co/workflows/${w.id}`,
    }));

    fs.writeFileSync(
      path.join(__dirname, '../docs/novu-workflow-configs.json'),
      JSON.stringify(workflowsList, null, 2),
    );

    console.log('\n📝 Workflow configurations saved to docs/novu-workflow-configs.json');

    console.log('\n🔗 Next steps:');
    console.log('1. Visit https://web.novu.co/workflows to customize templates');
    console.log('2. Configure notification groups and preferences');
    console.log('3. Test workflows with sample data');
    console.log('4. Set up integrations (email providers, etc.)');

    console.log('\n📧 Configure your email provider:');
    console.log('https://web.novu.co/integrations');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  setupNovuWorkflows();
}

module.exports = { setupNovuWorkflows, createNotificationTemplate };
