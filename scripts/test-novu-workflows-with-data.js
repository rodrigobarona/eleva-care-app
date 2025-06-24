#!/usr/bin/env node
/**
 * Test Novu Workflows with Sample Data
 *
 * Tests all workflows with realistic sample data for subscriber: 6839ee0b508ca4007dad35d3
 */

require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const SUBSCRIBER_ID = '6839ee0b508ca4007dad35d3';
const NOVU_SECRET_KEY = process.env.NOVU_SECRET_KEY;
const NOVU_API_URL = 'https://eu.api.novu.co';

console.log('🚀 Testing Novu Workflows with Sample Data\n');

if (!NOVU_SECRET_KEY) {
  console.error('❌ Missing NOVU_SECRET_KEY in environment variables');
  process.exit(1);
}

// Enhanced sample data for each workflow - testing all conditional event types
const workflowTests = [
  // 1. USER LIFECYCLE WORKFLOW - Test both event types
  {
    workflowId: 'user-lifecycle',
    name: 'User Lifecycle - Welcome',
    payload: {
      eventType: 'welcome',
      userName: 'João Silva',
      firstName: 'João',
      lastName: 'Silva',
      email: 'joao.silva@example.com',
      clerkUserId: 'user_' + Date.now(),
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'user-lifecycle',
    name: 'User Lifecycle - User Created',
    payload: {
      eventType: 'user-created',
      userName: 'Ana Costa',
      firstName: 'Ana',
      lastName: 'Costa',
      email: 'ana.costa@example.com',
      clerkUserId: 'user_' + Date.now(),
      locale: 'pt',
      country: 'PT',
    },
  },

  // 2. SECURITY-AUTH WORKFLOW - Test all 3 event types
  {
    workflowId: 'security-auth',
    name: 'Security Auth - Security Alert',
    payload: {
      eventType: 'security-alert',
      userId: 'user_' + Date.now(),
      alertType: 'suspicious-login',
      message: 'Suspicious login attempt detected from unknown location',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'security-auth',
    name: 'Security Auth - Account Verification',
    payload: {
      eventType: 'account-verification',
      userId: 'user_' + Date.now(),
      verificationUrl: 'https://eleva.care/verify/token_123',
      message: 'Please verify your account to continue',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'security-auth',
    name: 'Security Auth - Recent Login',
    payload: {
      eventType: 'recent-login',
      userId: 'user_' + Date.now(),
      deviceInfo: 'Chrome on MacOS',
      message: 'Recent login from Lisboa, Portugal',
      locale: 'pt',
      country: 'PT',
    },
  },

  // 3. PAYMENT UNIVERSAL WORKFLOW - Test all 4 event types
  {
    workflowId: 'payment-universal',
    name: 'Payment Universal - Payment Success',
    payload: {
      eventType: 'payment-success',
      amount: '75.00',
      planName: 'Consulta de Cardiologia',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'payment-universal',
    name: 'Payment Universal - Payment Failed',
    payload: {
      eventType: 'payment-failed',
      amount: '50.00',
      planName: 'Consulta de Dermatologia',
      reason: 'Insufficient funds',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'payment-universal',
    name: 'Payment Universal - Stripe Account Update',
    payload: {
      eventType: 'stripe-account-update',
      accountId: 'acct_' + Date.now(),
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'payment-universal',
    name: 'Payment Universal - Stripe Payout',
    payload: {
      eventType: 'stripe-payout',
      payoutAmount: '250.00',
      accountId: 'acct_' + Date.now(),
      locale: 'pt',
      country: 'PT',
    },
  },

  // 4. EXPERT MANAGEMENT WORKFLOW - Test all 5 event types
  {
    workflowId: 'expert-management',
    name: 'Expert Management - Onboarding Complete',
    payload: {
      eventType: 'onboarding-complete',
      expertId: 'expert_' + Date.now(),
      expertName: 'Dr. Maria Santos',
      stepType: 'onboarding',
      status: 'completed',
      message: 'Expert onboarding completed successfully',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'expert-management',
    name: 'Expert Management - Setup Step Complete',
    payload: {
      eventType: 'setup-step-complete',
      expertId: 'expert_' + Date.now(),
      expertName: 'Dr. Carlos Ferreira',
      stepType: 'calendar-setup',
      status: 'completed',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'expert-management',
    name: 'Expert Management - Identity Verification',
    payload: {
      eventType: 'identity-verification',
      expertId: 'expert_' + Date.now(),
      expertName: 'Dr. Ana Rodrigues',
      status: 'verified',
      message: 'Identity verification completed',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'expert-management',
    name: 'Expert Management - Google Account',
    payload: {
      eventType: 'google-account',
      expertId: 'expert_' + Date.now(),
      expertName: 'Dr. Pedro Silva',
      accountEmail: 'pedro.silva@gmail.com',
      status: 'connected',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'expert-management',
    name: 'Expert Management - Payout Setup Reminder',
    payload: {
      eventType: 'payout-setup-reminder',
      expertId: 'expert_' + Date.now(),
      expertName: 'Dr. Sofia Costa',
      setupUrl: 'https://eleva.care/setup/payout',
      message: 'Please complete your payout setup',
      locale: 'pt',
      country: 'PT',
    },
  },

  // 5. APPOINTMENT UNIVERSAL WORKFLOW - Test all 3 event types
  {
    workflowId: 'appointment-universal',
    name: 'Appointment Universal - Reminder',
    payload: {
      eventType: 'reminder',
      expertName: 'Dr. Maria Santos',
      clientName: 'João Silva',
      appointmentType: 'Consulta de Cardiologia',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      appointmentTime: '14:30',
      appointmentDetailsLink: 'https://eleva.care/appointments/apt_' + Date.now(),
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'appointment-universal',
    name: 'Appointment Universal - Cancelled',
    payload: {
      eventType: 'cancelled',
      expertName: 'Dr. Ana Costa',
      clientName: 'Maria Silva',
      appointmentType: 'Consulta de Dermatologia',
      appointmentDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
      appointmentTime: '10:00',
      cancellationReason: 'Expert unavailable due to emergency',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'appointment-universal',
    name: 'Appointment Universal - New Booking Expert',
    payload: {
      eventType: 'new-booking-expert',
      expertName: 'Dr. Carlos Ferreira',
      clientName: 'Pedro Santos',
      appointmentType: 'Consulta de Neurologia',
      appointmentDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().split('T')[0],
      appointmentTime: '16:00',
      clientNotes: 'Follow-up consultation for migraine treatment',
      appointmentDetailsLink: 'https://eleva.care/appointments/apt_' + Date.now(),
      locale: 'pt',
      country: 'PT',
    },
  },

  // 6. MARKETPLACE UNIVERSAL WORKFLOW - Test all 3 event types
  {
    workflowId: 'marketplace-universal',
    name: 'Marketplace Universal - Payment Received',
    payload: {
      eventType: 'payment-received',
      amount: '75.00',
      expertName: 'Dr. Ana Costa',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'marketplace-universal',
    name: 'Marketplace Universal - Payout Processed',
    payload: {
      eventType: 'payout-processed',
      amount: '150.00',
      expertName: 'Dr. Maria Santos',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'marketplace-universal',
    name: 'Marketplace Universal - Connect Account Status',
    payload: {
      eventType: 'connect-account-status',
      expertName: 'Dr. Pedro Silva',
      accountStatus: 'verified',
      locale: 'pt',
      country: 'PT',
    },
  },

  // 7. SYSTEM HEALTH WORKFLOW - Test health check failure
  {
    workflowId: 'system-health',
    name: 'System Health - Health Check Failure',
    payload: {
      eventType: 'health-check-failure',
      status: 'unhealthy',
      error: 'Response time increased to 2.5s',
      timestamp: new Date().toISOString(),
      environment: 'production',
      memory: {
        used: 1024,
        total: 2048,
        percentage: 50,
      },
      locale: 'pt',
      country: 'PT',
    },
  },

  // 8-10. EMAIL TEMPLATE WORKFLOWS (Non-universal)
  {
    workflowId: 'appointment-confirmation',
    name: 'Appointment Confirmation',
    payload: {
      expertName: 'Dr. Maria Santos',
      clientName: 'João Silva',
      appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      appointmentTime: '10:00',
      timezone: 'Europe/Lisbon',
      appointmentDuration: '60 minutes',
      eventTitle: 'Consulta de Cardiologia',
      meetLink: 'https://eleva.care/meet/apt_conf_' + Date.now(),
      notes: 'First consultation - health check',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'multibanco-booking-pending',
    name: 'Multibanco Booking Pending',
    payload: {
      customerName: 'João Silva',
      expertName: 'Dr. Maria Santos',
      serviceName: 'Consulta de Cardiologia',
      appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      appointmentTime: '10:00',
      timezone: 'Europe/Lisbon',
      duration: 60,
      multibancoEntity: '12345',
      multibancoReference: '987654321',
      multibancoAmount: '75.00',
      voucherExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      hostedVoucherUrl: 'https://eleva.care/payment/voucher/' + Date.now(),
      customerNotes: 'First consultation - health check',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'multibanco-payment-reminder',
    name: 'Multibanco Payment Reminder',
    payload: {
      customerName: 'João Silva',
      expertName: 'Dr. Maria Santos',
      serviceName: 'Consulta de Cardiologia',
      appointmentDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      appointmentTime: '10:00',
      timezone: 'Europe/Lisbon',
      duration: 60,
      multibancoEntity: '12345',
      multibancoReference: '987654321',
      multibancoAmount: '75.00',
      voucherExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      hostedVoucherUrl: 'https://eleva.care/payment/voucher/' + Date.now(),
      customerNotes: 'Payment reminder - expires soon',
      reminderType: 'urgent',
      daysRemaining: 1,
      locale: 'pt',
      country: 'PT',
    },
  },
];

async function testWorkflow(workflow) {
  try {
    console.log(`📧 Testing: ${workflow.name} (${workflow.workflowId})`);

    // Show which eventType is being tested for universal workflows
    if (workflow.payload.eventType) {
      console.log(`   🔄 Event Type: ${workflow.payload.eventType}`);
    }

    const response = await fetch(`${NOVU_API_URL}/v1/events/trigger`, {
      method: 'POST',
      headers: {
        Authorization: `ApiKey ${NOVU_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: workflow.workflowId,
        to: [SUBSCRIBER_ID],
        payload: workflow.payload,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const result = await response.json();
    console.log(`   ✅ Success - Transaction ID: ${result.transactionId}`);
    return {
      success: true,
      workflowId: workflow.workflowId,
      eventType: workflow.payload.eventType,
      transactionId: result.transactionId,
    };
  } catch (error) {
    console.log(`   ❌ Failed - ${error.message}`);
    return {
      success: false,
      workflowId: workflow.workflowId,
      eventType: workflow.payload.eventType,
      error: error.message,
    };
  }
}

async function testAllWorkflows() {
  console.log(`👤 Subscriber ID: ${SUBSCRIBER_ID}\n`);
  console.log('🧪 Starting comprehensive workflow tests...\n');

  const results = [];

  for (const workflow of workflowTests) {
    const result = await testWorkflow(workflow);
    results.push(result);

    // Small delay between tests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('\n📊 Test Summary:');
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`   ✅ Successful: ${successful.length}/${results.length}`);
  console.log(`   ❌ Failed: ${failed.length}/${results.length}`);

  // Group results by workflow type
  const universalWorkflows = [
    'user-lifecycle',
    'security-auth',
    'payment-universal',
    'expert-management',
    'appointment-universal',
    'marketplace-universal',
  ];

  console.log('\n🔄 Universal Workflows Test Coverage:');
  universalWorkflows.forEach((workflowId) => {
    const workflowResults = results.filter((r) => r.workflowId === workflowId);
    const successCount = workflowResults.filter((r) => r.success).length;
    const totalCount = workflowResults.length;

    console.log(`   ${workflowId}: ${successCount}/${totalCount} event types tested`);
    workflowResults.forEach((r) => {
      const status = r.success ? '✅' : '❌';
      console.log(`     ${status} ${r.eventType || 'N/A'}`);
    });
  });

  if (successful.length > 0) {
    console.log('\n🎉 Successful Tests:');
    successful.forEach((r) => {
      const eventInfo = r.eventType ? ` (${r.eventType})` : '';
      console.log(`   ✅ ${r.workflowId}${eventInfo} - ${r.transactionId}`);
    });
  }

  if (failed.length > 0) {
    console.log('\n💥 Failed Tests:');
    failed.forEach((r) => {
      const eventInfo = r.eventType ? ` (${r.eventType})` : '';
      console.log(`   ❌ ${r.workflowId}${eventInfo} - ${r.error}`);
    });
  }

  console.log('\n💡 Check your notifications at: https://web.novu.co/activities');
  console.log('💡 Monitor subscriber activity at: https://web.novu.co/subscribers');
  console.log('\n🎯 Universal Workflow Testing Tips:');
  console.log('   • Each universal workflow tests multiple eventType conditions');
  console.log('   • Check the Novu dashboard to see which steps were triggered');
  console.log('   • Verify in-app notifications appear for each event type');
  console.log('   • Email steps should only trigger for specific event types');
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage:');
  console.log('  pnpm test:workflows           # Test all workflows and event types');
  console.log('  pnpm test:workflows --help    # Show this help');
  console.log('\nUniversal Workflows Tested:');
  console.log('  • user-lifecycle: welcome, user-created');
  console.log('  • security-auth: security-alert, account-verification, recent-login');
  console.log(
    '  • payment-universal: payment-success, payment-failed, stripe-account-update, stripe-payout',
  );
  console.log(
    '  • expert-management: onboarding-complete, setup-step-complete, identity-verification, google-account, payout-setup-reminder',
  );
  console.log('  • appointment-universal: reminder, cancelled, new-booking-expert');
  console.log(
    '  • marketplace-universal: payment-received, payout-processed, connect-account-status',
  );
  console.log('  • system-health: health-check-failure');
  process.exit(0);
}

testAllWorkflows().catch(console.error);
