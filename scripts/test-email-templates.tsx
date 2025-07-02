#!/usr/bin/env node
/**
 * Email Template Testing Script for Eleva Care
 * Tests email templates using Resend's test addresses
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as React from 'react';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import { fileURLToPath } from 'url';

import { ENV_CONFIG, ENV_VALIDATORS } from '../config/env';
// Import email templates
import {
  AppointmentConfirmationTemplate,
  AppointmentReminderTemplate,
} from '../emails/appointments';

// Load environment variables from .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

interface TestScenario {
  name: string;
  template: React.ComponentType<Record<string, unknown>>;
  props: Record<string, unknown>;
  testAddress: 'delivered' | 'bounced' | 'complained';
}

const TEST_ADDRESSES = {
  delivered: 'delivered@resend.dev',
  bounced: 'bounced@resend.dev',
  complained: 'complained@resend.dev',
} as const;

const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'Appointment Confirmation',
    template: AppointmentConfirmationTemplate,
    props: {
      expertName: 'Dr. Maria Silva',
      clientName: 'João Silva',
      appointmentDate: '2024-03-20',
      appointmentTime: '14:00',
      timezone: 'Europe/Lisbon',
      appointmentDuration: '60 minutes',
      eventTitle: 'Initial Consultation',
      meetLink: 'https://eleva.care/meet/apt_conf_123',
      notes: 'First consultation - health check',
      locale: 'pt-BR',
    },
    testAddress: 'delivered',
  },
  {
    name: 'Appointment Reminder',
    template: AppointmentReminderTemplate,
    props: {
      patientName: 'João Silva',
      expertName: 'Dr. Maria Santos',
      appointmentDate: 'Monday, March 20, 2024',
      appointmentTime: '2:30 PM - 3:30 PM',
      timezone: 'Europe/Lisbon',
      duration: 60,
      appointmentType: 'Consulta de Cardiologia',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      rescheduleUrl: 'https://eleva.care/reschedule/123',
      cancelUrl: 'https://eleva.care/cancel/123',
    },
    testAddress: 'delivered',
  },
];

async function sendTestEmail(scenario: TestScenario): Promise<void> {
  try {
    console.log(`\n📧 Testing: ${scenario.name}`);
    console.log(`📍 To: ${TEST_ADDRESSES[scenario.testAddress]}`);

    const Template = scenario.template;
    const html = await render(<Template {...scenario.props} />);

    const resend = new Resend(ENV_CONFIG.RESEND_API_KEY);
    const response = await resend.emails.send({
      from: 'Eleva Care <onboarding@resend.dev>',
      to: TEST_ADDRESSES[scenario.testAddress],
      subject: `Test: ${scenario.name}`,
      html,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    if (!response.data) {
      throw new Error('No response data received from Resend API');
    }

    console.log(`✅ Sent successfully! Email ID: ${response.data.id}`);
  } catch (error) {
    console.error(`❌ Failed to send ${scenario.name}:`, error);
    throw error;
  }
}

async function runEmailTests(): Promise<void> {
  console.log('\n🎨 Eleva Care Email Template Testing');
  console.log('='.repeat(50));

  // Validate email configuration
  const emailValidation = ENV_VALIDATORS.email();
  if (!emailValidation.isValid) {
    console.error('❌ Email configuration is invalid:');
    console.error(emailValidation.message);
    console.error('\n💡 Add your Resend API key to .env:');
    console.error('RESEND_API_KEY=re_your_api_key_here');
    process.exit(1);
  }

  const delay = 2000; // 2 second delay between emails

  for (const scenario of TEST_SCENARIOS) {
    try {
      await sendTestEmail(scenario);
      if (scenario !== TEST_SCENARIOS[TEST_SCENARIOS.length - 1]) {
        console.log(`⏳ Waiting ${delay / 1000}s before next email...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`Failed to send ${scenario.name}:`, error);
    }
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEmailTests().catch((error) => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { runEmailTests, TEST_SCENARIOS };
