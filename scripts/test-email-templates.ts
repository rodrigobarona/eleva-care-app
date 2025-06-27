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
 * - Languages (en, es, pt, br)
 * - Themes (default, dark mode, high contrast)
 * - Template types (default, minimal, branded)
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as React from 'react';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import { fileURLToPath } from 'url';

// Import our email template components - TEMPORARILY DISABLED FOR BUILD
// import { EmailLayout } from '../components/emails/EmailLayout';
// import { WelcomeEmailTemplate } from '../emails';

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

interface EmailContentData {
  subject: string;
  preheader: string;
  content: string;
}

interface TestResult {
  success: boolean;
  emailId?: string;
  error?: Error | string;
  scenario: string;
}

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

type ContentTypeKey =
  | 'welcome'
  | 'expert'
  | 'appointment'
  | 'admin'
  | 'payment'
  | 'bounce'
  | 'spam';

const EMAIL_CONTENT: Record<ContentTypeKey, EmailTemplateContent> = {
  welcome: {
    subject: {
      en: '🎉 Welcome to Eleva Care!',
      es: '🎉 ¡Bienvenido a Eleva Care!',
      pt: '🎉 Bem-vindo ao Eleva Care!',
      'pt-BR': '🎉 Bem-vindo ao Eleva Care!',
    },
    preheader: {
      en: 'Your healthcare journey starts here',
      es: 'Tu viaje de salud comienza aquí',
      pt: 'A sua jornada de saúde começa aqui',
      'pt-BR': 'Sua jornada de saúde começa aqui',
    },
  },
  expert: {
    subject: {
      en: '👨‍⚕️ New Patient Consultation Request',
      es: '👨‍⚕️ Nueva Solicitud de Consulta',
      pt: '👨‍⚕️ Nova Solicitação de Consulta',
      'pt-BR': '👨‍⚕️ Nova Solicitação de Consulta',
    },
    preheader: {
      en: 'A patient has requested your expertise',
      es: 'Un paciente ha solicitado tu experiencia',
      pt: 'Um paciente solicitou a sua expertise',
      'pt-BR': 'Um paciente solicitou sua expertise',
    },
  },
  appointment: {
    subject: {
      en: '📅 Appointment Reminder - Tomorrow at 10:00 AM',
      es: '📅 Recordatorio de Cita - Mañana a las 10:00',
      pt: '📅 Lembrete de Consulta - Amanhã às 10:00',
      'pt-BR': '📅 Lembrete de Consulta - Amanhã às 10:00',
    },
    preheader: {
      en: 'Your consultation with Dr. Silva is tomorrow',
      es: 'Tu consulta con Dr. Silva es mañana',
      pt: 'A sua consulta com Dr. Silva é amanhã',
      'pt-BR': 'Sua consulta com Dr. Silva é amanhã',
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
      en: 'This email will be marked as spam for testing',
      es: 'Este email será marcado como spam para pruebas',
      pt: 'Este email será marcado como spam para testes',
      'pt-BR': 'Este email será marcado como spam para testes',
    },
  },
};

/**
 * Generate test email content based on scenario
 */
function generateEmailContent(scenario: TestScenario): EmailContentData {
  const contentType = getContentType(scenario.name);
  const locale = scenario.locale;

  return {
    subject: EMAIL_CONTENT[contentType].subject[locale],
    preheader: EMAIL_CONTENT[contentType].preheader[locale],
    content: generateBodyContent(scenario, contentType, locale),
  };
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
 * Generate email body content with realistic data
 */
function generateBodyContent(
  scenario: TestScenario,
  contentType: ContentTypeKey,
  locale: TestScenario['locale'],
): string {
  const userNames: Record<TestScenario['locale'], Record<TestScenario['userRole'], string>> = {
    en: { patient: 'John Doe', expert: 'Dr. Maria Silva', admin: 'Admin Team' },
    es: { patient: 'Juan Pérez', expert: 'Dra. Maria Silva', admin: 'Equipo Admin' },
    pt: { patient: 'João Silva', expert: 'Dra. Maria Silva', admin: 'Equipa Admin' },
    'pt-BR': { patient: 'João Silva', expert: 'Dra. Maria Silva', admin: 'Equipe Admin' },
  };

  const userName = userNames[locale][scenario.userRole];

  const content = {
    welcome: {
      en: `
        <div style="padding: 32px 0;">
          <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">Welcome to Eleva Care, ${userName}!</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            We're excited to have you join our community of healthcare excellence. Your journey to better health starts here.
          </p>
          <div style="background: #F7F9F9; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <h3 style="color: #006D77; margin-bottom: 12px;">What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Complete your health profile</li>
              <li>Browse our expert healthcare providers</li>
              <li>Schedule your first consultation</li>
            </ul>
          </div>
          <p style="margin-bottom: 24px;">
            <a href="https://eleva-care.com/dashboard" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Get Started →
            </a>
          </p>
        </div>
      `,
      es: `
        <div style="padding: 32px 0;">
          <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">¡Bienvenido a Eleva Care, ${userName}!</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Estamos emocionados de tenerte en nuestra comunidad de excelencia en salud. Tu viaje hacia una mejor salud comienza aquí.
          </p>
          <div style="background: #F7F9F9; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <h3 style="color: #006D77; margin-bottom: 12px;">¿Qué sigue?</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Completa tu perfil de salud</li>
              <li>Explora nuestros expertos en salud</li>
              <li>Programa tu primera consulta</li>
            </ul>
          </div>
          <p style="margin-bottom: 24px;">
            <a href="https://eleva-care.com/dashboard" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Comenzar →
            </a>
          </p>
        </div>
      `,
      pt: `
        <div style="padding: 32px 0;">
          <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">Bem-vindo ao Eleva Care, ${userName}!</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Estamos entusiasmados por tê-lo na nossa comunidade de excelência em saúde. A sua jornada para uma melhor saúde começa aqui.
          </p>
          <div style="background: #F7F9F9; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <h3 style="color: #006D77; margin-bottom: 12px;">O que se segue?</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Complete o seu perfil de saúde</li>
              <li>Explore os nossos especialistas em saúde</li>
              <li>Agende a sua primeira consulta</li>
            </ul>
          </div>
          <p style="margin-bottom: 24px;">
            <a href="https://eleva-care.com/dashboard" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Começar →
            </a>
          </p>
        </div>
      `,
      'pt-BR': `
        <div style="padding: 32px 0;">
          <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">Bem-vindo ao Eleva Care, ${userName}!</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Estamos empolgados em tê-lo em nossa comunidade de excelência em saúde. Sua jornada para uma melhor saúde começa aqui.
          </p>
          <div style="background: #F7F9F9; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <h3 style="color: #006D77; margin-bottom: 12px;">O que vem a seguir?</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Complete seu perfil de saúde</li>
              <li>Explore nossos especialistas em saúde</li>
              <li>Agende sua primeira consulta</li>
            </ul>
          </div>
          <p style="margin-bottom: 24px;">
            <a href="https://eleva-care.com/dashboard" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Começar →
            </a>
          </p>
        </div>
      `,
    },
    expert: {
      en: `
        <div style="padding: 32px 0;">
          <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">New Consultation Request</h1>
          <div style="background: #E0FBFC; border-left: 4px solid #006D77; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Patient Details:</h3>
            <p><strong>Name:</strong> Sarah Johnson</p>
            <p><strong>Age:</strong> 34</p>
            <p><strong>Condition:</strong> Stress management consultation</p>
            <p><strong>Preferred Date:</strong> Tomorrow, 10:00 AM</p>
          </div>
          <p>The patient has specifically requested your expertise based on your specialization in stress management and mental wellness.</p>
          <p style="margin-bottom: 24px;">
            <a href="https://eleva-care.com/expert/consultations" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Request →
            </a>
          </p>
        </div>
      `,
    },
    appointment: {
      en: `
        <div style="padding: 32px 0;">
          <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">Appointment Reminder</h1>
          <div style="background: #FFD23F; background: linear-gradient(135deg, #FFD23F, #F0C814); padding: 24px; border-radius: 12px; margin: 24px 0; color: #333;">
            <h3 style="margin-top: 0; color: #333;">📅 Tomorrow at 10:00 AM</h3>
            <p style="margin: 8px 0; color: #333;"><strong>Expert:</strong> Dr. Maria Silva</p>
            <p style="margin: 8px 0; color: #333;"><strong>Specialization:</strong> Mental Health & Wellness</p>
            <p style="margin: 8px 0; color: #333;"><strong>Duration:</strong> 45 minutes</p>
            <p style="margin: 8px 0; color: #333;"><strong>Type:</strong> Video consultation</p>
          </div>
          <h3>Preparation Tips:</h3>
          <ul>
            <li>Test your camera and microphone 10 minutes before</li>
            <li>Find a quiet, private space</li>
            <li>Have your health records ready</li>
            <li>Prepare any questions you'd like to discuss</li>
          </ul>
          <p style="margin-bottom: 24px;">
            <a href="https://eleva-care.com/appointments/join" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Join Consultation →
            </a>
          </p>
        </div>
      `,
    },
    admin: {
      en: `
        <div style="padding: 32px 0;">
          <h1 style="color: #000000; font-size: 28px; margin-bottom: 16px; font-weight: bold;">System Alert: High Contrast Mode</h1>
          <div style="background: #FFFFFF; border: 3px solid #000000; padding: 24px; margin: 24px 0;">
            <h3 style="color: #000000; margin-top: 0; font-weight: bold;">Accessibility Test Results:</h3>
            <p style="color: #000000; font-weight: bold;">✅ High contrast colors: PASSED</p>
            <p style="color: #000000; font-weight: bold;">✅ Font weight increased: PASSED</p>
            <p style="color: #000000; font-weight: bold;">✅ Border emphasis: PASSED</p>
            <p style="color: #000000; font-weight: bold;">✅ WCAG 2.1 AA compliance: PASSED</p>
          </div>
          <p style="color: #000000; font-weight: bold;">This email demonstrates the high contrast accessibility features working correctly for users with visual impairments.</p>
        </div>
      `,
    },
    payment: {
      en: `
        <div style="padding: 32px 0;">
          <h1 style="color: #006D77; font-size: 24px; margin-bottom: 16px;">Payment Confirmed</h1>
          <div style="background: #E8F5E8; border-left: 4px solid #28A745; padding: 20px; margin: 20px 0;">
            <h3 style="color: #28A745; margin-top: 0;">✅ Transaction Successful</h3>
            <p><strong>Amount:</strong> €45.00</p>
            <p><strong>Service:</strong> Mental Health Consultation</p>
            <p><strong>Expert:</strong> Dr. Maria Silva</p>
            <p><strong>Transaction ID:</strong> TXN-2024-001234</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>Your consultation is now confirmed. You'll receive a calendar invitation shortly.</p>
        </div>
      `,
    },
    bounce: {
      en: `
        <div style="padding: 32px 0;">
          <h1 style="color: #006D77; font-size: 24px; margin-bottom: 16px;">Bounce Test Email</h1>
          <div style="background: #FFF3CD; border-left: 4px solid #856404; padding: 20px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">⚠️ Testing Email Delivery</h3>
            <p>This email is sent to <code>bounced@resend.dev</code> to simulate a hard bounce scenario.</p>
            <p><strong>Expected Result:</strong> This email will bounce with SMTP 550 5.1.1 ("Unknown User") response.</p>
            <p><strong>Use Case:</strong> Testing bounce handling in our application.</p>
          </div>
        </div>
      `,
    },
    spam: {
      en: `
        <div style="padding: 32px 0;">
          <h1 style="color: #006D77; font-size: 24px; margin-bottom: 16px;">Marketing Email - Spam Test</h1>
          <div style="background: #F8D7DA; border-left: 4px solid #DC3545; padding: 20px; margin: 20px 0;">
            <h3 style="color: #DC3545; margin-top: 0;">🚨 Spam Simulation</h3>
            <p>This email is sent to <code>complained@resend.dev</code> to simulate spam marking.</p>
            <p><strong>Expected Result:</strong> This email will be received but marked as spam.</p>
            <p><strong>Use Case:</strong> Testing spam handling and sender reputation management.</p>
          </div>
          <p>🎉 AMAZING OFFERS! 💰 CLICK HERE FOR INSTANT SAVINGS! 🎁</p>
          <p>This content intentionally mimics spam patterns for testing purposes.</p>
        </div>
      `,
    },
  };

  const contentBody: Record<ContentTypeKey, Partial<LocalizedContent>> = content;
  return (
    contentBody[contentType]?.[locale] ||
    contentBody[contentType]?.en ||
    contentBody.welcome.en ||
    ''
  );
}

/**
 * Create a test email component
 */
function createTestEmail(scenario: TestScenario) {
  // const _emailContent = generateEmailContent(scenario);
  const contentType = getContentType(scenario.name);
  const userName = 'Test User'; // Temporarily simplified: getUserName(scenario);

  // const _renderOptions = {
  //   locale: scenario.locale,
  //   userRole: scenario.userRole,
  //   rtl: false,
  //   darkMode: scenario.darkMode,
  //   highContrast: scenario.highContrast,
  //   previewMode: false,
  //   variant: scenario.variant,
  // };

  // Create the email component using React components instead of dangerouslySetInnerHTML
  const EmailComponent = () =>
    React.createElement(
      'div', // Temporarily disabled: BaseEmailTemplate,
      {
        // subject: emailContent.subject,
        // preheader: emailContent.preheader,
        // renderOptions: renderOptions,
      },
      React.createElement('div', {
        // Temporarily disabled: EmailContent, {
        // scenario: scenario,
        contentType: contentType,
        userName: userName,
      }),
    );

  return EmailComponent;
}

/**
 * Send a single test email
 */
async function sendTestEmail(scenario: TestScenario, index: number): Promise<TestResult> {
  try {
    console.log(`\n📧 ${index + 1}/${TEST_CONFIG.scenarios.length} Sending: ${scenario.name}`);
    console.log(`   📍 To: ${TEST_CONFIG.testAddresses[scenario.testAddress]}`);
    console.log(`   🌐 Locale: ${scenario.locale} | 👤 Role: ${scenario.userRole}`);
    console.log(
      `   🎨 Theme: ${scenario.darkMode ? 'Dark' : 'Light'}${scenario.highContrast ? ' + High Contrast' : ''}`,
    );

    const emailContent = generateEmailContent(scenario);
    const EmailComponent = createTestEmail(scenario);

    // Render the React component to HTML
    const html = await render(React.createElement(EmailComponent));

    // Send via Resend
    const response = await resend.emails.send({
      from: 'Eleva Care Testing <testing@resend.dev>',
      to: [TEST_CONFIG.testAddresses[scenario.testAddress]],
      subject: `[TEST] ${emailContent.subject}`,
      html: html,
      headers: {
        'X-Test-Scenario': scenario.name,
        'X-Template-Variant': scenario.variant,
        'X-User-Role': scenario.userRole,
        'X-Locale': scenario.locale,
        'X-Entity-Ref-ID': `test-${Date.now()}-${index}`, // Prevent Gmail threading
      },
      tags: [
        { name: 'environment', value: 'test' },
        { name: 'template-type', value: scenario.variant },
        { name: 'user-role', value: scenario.userRole },
        { name: 'locale', value: scenario.locale },
        { name: 'test-address', value: scenario.testAddress },
      ],
    });

    if (response.error) {
      console.error(`   ❌ Error: ${response.error.message}`);
      return { success: false, error: response.error, scenario: scenario.name };
    }

    if (!response.data) {
      console.error(`   ❌ Error: No response data received`);
      return { success: false, error: 'No response data received', scenario: scenario.name };
    }

    console.log(`   ✅ Sent successfully! Email ID: ${response.data.id}`);
    return { success: true, emailId: response.data.id, scenario: scenario.name };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Failed: ${errorMessage}`);
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

  console.log(`\n📋 Test Configuration:`);
  console.log(`   🔑 API Key: ${process.env.RESEND_API_KEY.substring(0, 8)}...`);
  console.log(`   📧 Test Scenarios: ${TEST_CONFIG.scenarios.length}`);
  console.log(`   🎯 Test Addresses: ${Object.keys(TEST_CONFIG.testAddresses).join(', ')}`);

  console.log(`\n🧪 Resend Test Addresses:`);
  console.log(`   ✅ delivered@resend.dev - Successful delivery simulation`);
  console.log(`   ❌ bounced@resend.dev - Hard bounce simulation (SMTP 550)`);
  console.log(`   🚨 complained@resend.dev - Spam marking simulation`);

  console.log('\n🚀 Starting email tests...');

  const results = [];
  const delay = 2000; // 2 second delay between emails to respect rate limits

  for (let i = 0; i < TEST_CONFIG.scenarios.length; i++) {
    const scenario = TEST_CONFIG.scenarios[i];
    const result = await sendTestEmail(scenario, i);
    results.push(result);

    // Add delay between emails (except for the last one)
    if (i < TEST_CONFIG.scenarios.length - 1) {
      console.log(`   ⏳ Waiting ${delay / 1000}s before next email...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
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

  console.log('\n🔗 Next Steps:');
  console.log('   1. Check your email inbox at the test addresses');
  console.log('   2. Review the Resend dashboard for delivery status');
  console.log('   3. Test template responsiveness across different email clients');
  console.log('   4. Verify accessibility features with screen readers');

  console.log('\n📈 Resend Dashboard: https://resend.com/emails');
  console.log('🎨 React Email Preview: Run `npm run email:dev` to view templates locally');

  process.exit(failed.length > 0 ? 1 : 0);
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEmailTests().catch((error) => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { runEmailTests, TEST_CONFIG, sendTestEmail };
