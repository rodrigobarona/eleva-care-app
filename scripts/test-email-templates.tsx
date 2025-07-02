#!/usr/bin/env node
/**
 * Email Template Testing Script for Eleva Care
 *
 * Tests the email template system using Resend's testing addresses:
 * - delivered@resend.dev (successful delivery)
 * - bounced@resend.dev (bounce simulation)
 * - complained@resend.dev (spam marking simulation)
 *
 * This script demonstrates all email template variants with different:
 * - User roles (patient, expert, admin)
 * - Languages (en, es, pt, pt-BR)
 * - Themes (default, dark mode, high contrast)
 * - Template types (default, minimal, branded)
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as React from 'react';
import { renderAsync } from '@react-email/render';
import { Resend } from 'resend';
import { fileURLToPath } from 'url';

// Import our email template components
import { EmailDivider } from '../components/emails/EmailDivider';
import { EmailLayout } from '../components/emails/EmailLayout';
import { EmailSection } from '../components/emails/EmailSection';
import { EmailText } from '../components/emails/EmailText';

// TypeScript interfaces
interface TestScenario {
  name: string;
  locale: 'en' | 'es' | 'pt' | 'pt-BR';
  userRole: 'patient' | 'expert' | 'admin';
  darkMode: boolean;
  highContrast: boolean;
  variant: string;
  testAddress: 'delivered' | 'bounced' | 'complained';
}

interface TestResult {
  success: boolean;
  emailId?: string;
  error?: Error | string;
  scenario: string;
}

interface EmailContentData {
  subject: string;
  preheader: string;
  content: React.ReactNode;
}

type ContentTypeKey =
  | 'welcome'
  | 'expert'
  | 'appointment'
  | 'admin'
  | 'payment'
  | 'bounce'
  | 'spam';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Validate and initialize Resend client
if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set');
}
const resend = new Resend(process.env.RESEND_API_KEY);

// Test configuration
const TEST_CONFIG: {
  testAddresses: Record<TestScenario['testAddress'], string>;
  scenarios: TestScenario[];
} = {
  // Resend test addresses for different scenarios
  testAddresses: {
    delivered: 'delivered@resend.dev', // Successful delivery
    bounced: 'bounced@resend.dev', // Hard bounce simulation
    complained: 'complained@resend.dev', // Spam marking simulation
  },

  // Email template test scenarios
  scenarios: [
    {
      name: '🎯 Welcome Email - New Patient (English)',
      locale: 'en',
      userRole: 'patient',
      darkMode: false,
      highContrast: false,
      variant: 'branded',
      testAddress: 'delivered',
    },
    {
      name: '🏥 Expert Notification - Spanish',
      locale: 'es',
      userRole: 'expert',
      darkMode: false,
      highContrast: false,
      variant: 'default',
      testAddress: 'delivered',
    },
    {
      name: '🌙 Appointment Reminder - Dark Mode (Portuguese PT)',
      locale: 'pt',
      userRole: 'patient',
      darkMode: true,
      highContrast: false,
      variant: 'minimal',
      testAddress: 'delivered',
    },
    {
      name: '♿ High Contrast - Admin Alert (Portuguese BR)',
      locale: 'pt-BR',
      userRole: 'admin',
      darkMode: false,
      highContrast: true,
      variant: 'default',
      testAddress: 'delivered',
    },
    {
      name: '📧 Payment Confirmation - Minimal Template',
      locale: 'en',
      userRole: 'patient',
      darkMode: false,
      highContrast: false,
      variant: 'minimal',
      testAddress: 'delivered',
    },
    {
      name: '🧪 Bounce Test - System Alert',
      locale: 'en',
      userRole: 'admin',
      darkMode: false,
      highContrast: false,
      variant: 'default',
      testAddress: 'bounced',
    },
    {
      name: '🚨 Spam Test - Marketing Email',
      locale: 'en',
      userRole: 'patient',
      darkMode: false,
      highContrast: false,
      variant: 'branded',
      testAddress: 'complained',
    },
  ],
};

/**
 * Sample email content for different template types
 */
type LocalizedContent = {
  en: string;
  es: string;
  pt: string;
  'pt-BR': string;
};

type EmailTemplateContent = {
  subject: LocalizedContent;
  preheader: LocalizedContent;
};

const EMAIL_CONTENT: Record<ContentTypeKey, EmailTemplateContent> = {
  welcome: {
    subject: {
      en: '👋 Welcome to Eleva Care',
      es: '👋 Bienvenido a Eleva Care',
      pt: '👋 Bem-vindo à Eleva Care',
      'pt-BR': '👋 Bem-vindo à Eleva Care',
    },
    preheader: {
      en: 'Start your health journey with us',
      es: 'Comienza tu viaje de salud con nosotros',
      pt: 'Comece a sua jornada de saúde connosco',
      'pt-BR': 'Comece sua jornada de saúde conosco',
    },
  },
  expert: {
    subject: {
      en: '🏥 New Expert Notification',
      es: '🏥 Nueva Notificación de Experto',
      pt: '🏥 Nova Notificação de Especialista',
      'pt-BR': '🏥 Nova Notificação de Especialista',
    },
    preheader: {
      en: 'Important update for healthcare providers',
      es: 'Actualización importante para proveedores de salud',
      pt: 'Atualização importante para profissionais de saúde',
      'pt-BR': 'Atualização importante para profissionais de saúde',
    },
  },
  appointment: {
    subject: {
      en: '📅 Appointment Reminder',
      es: '📅 Recordatorio de Cita',
      pt: '📅 Lembrete de Consulta',
      'pt-BR': '📅 Lembrete de Consulta',
    },
    preheader: {
      en: 'Your consultation is tomorrow',
      es: 'Tu consulta es mañana',
      pt: 'A sua consulta é amanhã',
      'pt-BR': 'Sua consulta é amanhã',
    },
  },
  admin: {
    subject: {
      en: '🔒 System Alert: High Contrast Mode Test',
      es: '🔒 Alerta del Sistema: Prueba de Alto Contraste',
      pt: '🔒 Alerta do Sistema: Teste de Alto Contraste',
      'pt-BR': '🔒 Alerta do Sistema: Teste de Alto Contraste',
    },
    preheader: {
      en: 'Accessibility features working correctly',
      es: 'Funciones de accesibilidad funcionando correctamente',
      pt: 'Funcionalidades de acessibilidade a funcionar corretamente',
      'pt-BR': 'Funcionalidades de acessibilidade funcionando corretamente',
    },
  },
  payment: {
    subject: {
      en: '💳 Payment Confirmation - €45.00',
      es: '💳 Confirmación de Pago - €45.00',
      pt: '💳 Confirmação de Pagamento - €45.00',
      'pt-BR': '💳 Confirmação de Pagamento - €45.00',
    },
    preheader: {
      en: 'Your payment was processed successfully',
      es: 'Tu pago fue procesado exitosamente',
      pt: 'O seu pagamento foi processado com sucesso',
      'pt-BR': 'Seu pagamento foi processado com sucesso',
    },
  },
  bounce: {
    subject: {
      en: '🧪 Test Email - Bounce Simulation',
      es: '🧪 Email de Prueba - Simulación de Rebote',
      pt: '🧪 Email de Teste - Simulação de Rejeição',
      'pt-BR': '🧪 Email de Teste - Simulação de Rejeição',
    },
    preheader: {
      en: 'This email will bounce for testing purposes',
      es: 'Este email rebotará para propósitos de prueba',
      pt: 'Este email será rejeitado para fins de teste',
      'pt-BR': 'Este email será rejeitado para fins de teste',
    },
  },
  spam: {
    subject: {
      en: '🚨 Marketing Email - Spam Test',
      es: '🚨 Email de Marketing - Prueba de Spam',
      pt: '🚨 Email de Marketing - Teste de Spam',
      'pt-BR': '🚨 Email de Marketing - Teste de Spam',
    },
    preheader: {
      en: 'This email will be marked as spam',
      es: 'Este email será marcado como spam',
      pt: 'Este email será marcado como spam',
      'pt-BR': 'Este email será marcado como spam',
    },
  },
};

/**
 * Get a sample user name based on the scenario
 */
function getUserName(scenario: TestScenario): string {
  switch (scenario.userRole) {
    case 'patient':
      return 'Maria Silva';
    case 'expert':
      return 'Dr. João Santos';
    case 'admin':
      return 'Admin User';
    default:
      return 'Test User';
  }
}

/**
 * Determine content type from scenario name
 */
function getContentType(scenarioName: string): ContentTypeKey {
  if (scenarioName.includes('Welcome')) return 'welcome';
  if (scenarioName.includes('Expert')) return 'expert';
  if (scenarioName.includes('Appointment')) return 'appointment';
  if (scenarioName.includes('Admin') || scenarioName.includes('High Contrast')) return 'admin';
  if (scenarioName.includes('Payment')) return 'payment';
  if (scenarioName.includes('Bounce')) return 'bounce';
  if (scenarioName.includes('Spam')) return 'spam';
  return 'welcome';
}

/**
 * Generate email content based on scenario
 */
function generateEmailContent(scenario: TestScenario): EmailContentData {
  try {
    const contentType = getContentType(scenario.name);
    const content = EMAIL_CONTENT[contentType];

    if (!content) {
      throw new Error(`No content found for content type: ${contentType}`);
    }

    if (!content.subject[scenario.locale]) {
      console.warn(`No subject found for locale ${scenario.locale}, falling back to English`);
    }

    if (!content.preheader[scenario.locale]) {
      console.warn(`No preheader found for locale ${scenario.locale}, falling back to English`);
    }

    return {
      subject: content.subject[scenario.locale] || content.subject.en,
      preheader: content.preheader[scenario.locale] || content.preheader.en,
      content: generateBodyContent(scenario, contentType, scenario.locale),
    };
  } catch (error) {
    console.error('Error generating email content:', error);
    throw error;
  }
}

/**
 * Generate body content based on scenario
 */
function generateBodyContent(
  scenario: TestScenario,
  contentType: ContentTypeKey,
  locale: TestScenario['locale'],
): React.ReactNode {
  try {
    const userName = getUserName(scenario);
    const content = EMAIL_CONTENT[contentType];

    if (!content) {
      throw new Error(`No content found for content type: ${contentType}`);
    }

    // Get localized content or fallback to English
    const subject = content.subject[locale] || content.subject.en;
    const preheader = content.preheader[locale] || content.preheader.en;

    return (
      <EmailSection>
        <EmailText>{subject}</EmailText>
        <EmailDivider />
        <EmailText>{preheader}</EmailText>
        <EmailText>{`Hello ${userName},`}</EmailText>
      </EmailSection>
    );
  } catch (error) {
    console.error('Error generating body content:', error);
    throw error;
  }
}

/**
 * Create the email component
 */
function createTestEmail(scenario: TestScenario) {
  const emailContent = generateEmailContent(scenario);

  const EmailComponent = () => {
    try {
      return (
        <EmailLayout
          subject={emailContent.subject}
          preheader={emailContent.preheader}
          locale={scenario.locale}
          userRole={scenario.userRole}
          darkMode={scenario.darkMode}
          highContrast={scenario.highContrast}
          headerVariant={scenario.variant as 'default' | 'minimal' | 'branded' | undefined}
          footerVariant={scenario.variant as 'default' | 'minimal' | 'branded' | undefined}
        >
          {emailContent.content}
        </EmailLayout>
      );
    } catch (error) {
      console.error('Error rendering email component:', error);
      throw error;
    }
  };

  return EmailComponent;
}

/**
 * Send a test email
 */
async function sendTestEmail(scenario: TestScenario, index: number): Promise<TestResult> {
  try {
    console.log(`\n📧 ${index + 1}/${TEST_CONFIG.scenarios.length} Sending: ${scenario.name}`);
    console.log(`   📍 To: ${TEST_CONFIG.testAddresses[scenario.testAddress]}`);
    console.log(`   🌐 Locale: ${scenario.locale} | 👤 Role: ${scenario.userRole}`);
    console.log(
      `   🎨 Theme: ${scenario.darkMode ? 'Dark' : 'Light'}${scenario.highContrast ? ' + High Contrast' : ''}`,
    );

    const EmailComponent = createTestEmail(scenario);
    console.log('   📝 Rendering email template...');

    // Use renderAsync with options for better HTML output
    const html = await renderAsync(<EmailComponent />, {
      pretty: true, // Format HTML for better readability
      plainText: false, // We'll handle plain text separately if needed
    });

    if (!html) {
      throw new Error('Failed to render email template - no HTML output');
    }

    // Log the first and last 100 characters of the rendered HTML for debugging
    console.log('   🔍 Debug: Rendered HTML preview:');
    console.log('   Start:', html.substring(0, 100) + '...');
    console.log('   End:', '...' + html.substring(html.length - 100));

    console.log('   📤 Sending email...');
    console.log('   🔍 Debug: Request payload:', {
      from: 'Eleva Care <onboarding@resend.dev>',
      to: TEST_CONFIG.testAddresses[scenario.testAddress],
      subject: `Test Email: ${scenario.name}`,
      html: html.substring(0, 100) + '...',
    });

    interface ResendResponse {
      data?: {
        id: string;
      };
      error?: {
        message: string;
        name: string;
        statusCode: number;
      };
    }

    const response = (await resend.emails.send({
      from: 'Eleva Care <onboarding@resend.dev>',
      to: TEST_CONFIG.testAddresses[scenario.testAddress],
      subject: `Test Email: ${scenario.name}`,
      html,
    })) as ResendResponse;

    console.log('   🔍 Debug: Resend API response:', JSON.stringify(response, null, 2));

    if (!response) {
      throw new Error(
        'No response from Resend API - this might indicate a network issue or API timeout',
      );
    }

    if ('error' in response) {
      const errorMessage = response.error?.message || 'Unknown error from Resend API';
      console.error(`   ❌ Error: ${errorMessage}`);
      console.error('   📋 Full error details:', JSON.stringify(response.error, null, 2));
      return { success: false, error: errorMessage, scenario: scenario.name };
    }

    if (!response.data?.id) {
      throw new Error(
        'Resend API returned success but no email ID - this might indicate a partial failure',
      );
    }

    console.log(`   ✅ Sent successfully! Email ID: ${response.data.id}`);
    return { success: true, emailId: response.data.id, scenario: scenario.name };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Failed: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      console.error('   Stack trace:', error.stack);
    }
    return { success: false, error: errorMessage, scenario: scenario.name };
  }
}

/**
 * Main testing function
 */
async function runEmailTests(): Promise<void> {
  console.log('\n🎨 Eleva Care Email Template Testing System');
  console.log('='.repeat(50));

  // Validate environment
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY environment variable is required');
    console.log('💡 Add your Resend API key to .env.local:');
    console.log('   RESEND_API_KEY=re_your_api_key_here');
    process.exit(1);
  }

  // Validate API key format
  if (!process.env.RESEND_API_KEY.startsWith('re_')) {
    console.warn('⚠️ Warning: RESEND_API_KEY should start with "re_"');
  }

  console.log(`\n📋 Test Configuration:`);
  console.log(`   🔑 API Key: ${process.env.RESEND_API_KEY.substring(0, 8)}...`);
  console.log(`   📧 Test Scenarios: ${TEST_CONFIG.scenarios.length}`);
  console.log(`   🎯 Test Addresses: ${Object.keys(TEST_CONFIG.testAddresses).join(', ')}`);

  console.log('\n🧪 Resend Test Addresses:');
  console.log('   ✅ delivered@resend.dev - Successful delivery simulation');
  console.log('   ❌ bounced@resend.dev - Hard bounce simulation (SMTP 550)');
  console.log('   🚨 complained@resend.dev - Spam marking simulation');

  console.log('\n🚀 Starting email tests...');

  const results: TestResult[] = [];
  const delay = 2000; // 2 second delay between emails to respect rate limits
  let hasErrors = false;

  for (let i = 0; i < TEST_CONFIG.scenarios.length; i++) {
    const scenario = TEST_CONFIG.scenarios[i];

    try {
      console.log(`\n📝 Validating scenario ${i + 1}/${TEST_CONFIG.scenarios.length}:`);
      console.log(`   Name: ${scenario.name}`);
      console.log(`   Locale: ${scenario.locale}`);
      console.log(`   User Role: ${scenario.userRole}`);
      console.log(
        `   Theme: ${scenario.darkMode ? 'Dark' : 'Light'}${scenario.highContrast ? ' + High Contrast' : ''}`,
      );
      console.log(`   Variant: ${scenario.variant}`);
      console.log(`   Test Address: ${scenario.testAddress}`);

      const result = await sendTestEmail(scenario, i);
      results.push(result);

      if (!result.success) {
        hasErrors = true;
        console.error(`\n❌ Test failed for scenario: ${scenario.name}`);
        console.error(`   Error: ${result.error}`);
      }

      // Add delay between emails (except for the last one)
      if (i < TEST_CONFIG.scenarios.length - 1) {
        console.log(`   ⏳ Waiting ${delay / 1000}s before next email...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      hasErrors = true;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Unexpected error in scenario: ${scenario.name}`);
      console.error(`   Error: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        console.error('   Stack trace:', error.stack);
      }
      results.push({
        success: false,
        error: errorMessage,
        scenario: scenario.name,
      });
    }
  }

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('='.repeat(50));

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);

  if (successful.length > 0) {
    console.log('\n✅ Successful Emails:');
    successful.forEach((result) => {
      console.log(`   📧 ${result.scenario} (ID: ${result.emailId})`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed Emails:');
    failed.forEach((result) => {
      console.log(`   📧 ${result.scenario}`);
      console.log(`      Error: ${result.error}`);
    });
  }

  // Print troubleshooting tips if there were errors
  if (hasErrors) {
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check your Resend API key is valid and has sufficient permissions');
    console.log('2. Verify your email templates are properly formatted');
    console.log('3. Ensure all required translations are available');
    console.log('4. Check the Resend dashboard for detailed delivery status');
    console.log('5. Run with DEBUG=true for more detailed logging');

    process.exit(1); // Exit with error code
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEmailTests().catch((error) => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { runEmailTests, TEST_CONFIG, sendTestEmail };
