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

// Sample data for each workflow
const workflowTests = [
  {
    workflowId: 'user-lifecycle',
    name: 'User Lifecycle',
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
    workflowId: 'expert-management',
    name: 'Expert Management',
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
    workflowId: 'appointment-universal',
    name: 'Appointment Universal',
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
    workflowId: 'payment-universal',
    name: 'Payment Universal',
    payload: {
      eventType: 'payment-success',
      amount: '75.00',
      planName: 'Consulta de Cardiologia',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'marketplace-universal',
    name: 'Marketplace Universal',
    payload: {
      eventType: 'payment-received',
      amount: '75.00',
      expertName: 'Dr. Ana Costa',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'security-auth',
    name: 'Security Authentication',
    payload: {
      eventType: 'recent-login',
      userId: 'user_' + Date.now(),
      deviceInfo: 'Chrome on MacOS',
      message: 'Recent login from Lisboa, Portugal',
      locale: 'pt',
      country: 'PT',
    },
  },
  {
    workflowId: 'system-health',
    name: 'System Health',
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
    return { success: true, workflowId: workflow.workflowId, transactionId: result.transactionId };
  } catch (error) {
    console.log(`   ❌ Failed - ${error.message}`);
    return { success: false, workflowId: workflow.workflowId, error: error.message };
  }
}

async function testAllWorkflows() {
  console.log(`👤 Subscriber ID: ${SUBSCRIBER_ID}\n`);
  console.log('🧪 Starting workflow tests...\n');

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

  if (successful.length > 0) {
    console.log('\n🎉 Successful Tests:');
    successful.forEach((r) => {
      console.log(`   ✅ ${r.workflowId} - ${r.transactionId}`);
    });
  }

  if (failed.length > 0) {
    console.log('\n💥 Failed Tests:');
    failed.forEach((r) => {
      console.log(`   ❌ ${r.workflowId} - ${r.error}`);
    });
  }

  console.log('\n💡 Check your notifications at: https://web.novu.co/activities');
  console.log('💡 Monitor subscriber activity at: https://web.novu.co/subscribers');
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage:');
  console.log('  pnpm test:workflows           # Test all workflows');
  console.log('  pnpm test:workflows --help    # Show this help');
  process.exit(0);
}

testAllWorkflows().catch(console.error);
