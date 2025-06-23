// Import our email template components
import { BaseEmailTemplate } from '@/lib/email-templates/components/BaseEmailTemplate';
import { render } from '@react-email/render';
import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * GET /api/test-email - Send a test email using Resend
 *
 * Query parameters:
 * - to: recipient email (defaults to delivered@resend.dev)
 * - locale: language code (en, es, pt, br)
 * - userRole: user role (patient, expert, admin)
 * - darkMode: boolean for dark theme
 * - highContrast: boolean for high contrast
 * - variant: template variant (default, minimal, branded)
 * - type: email type (welcome, expert, appointment, admin, payment)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters with defaults
    const config = {
      to: searchParams.get('to') || 'delivered@resend.dev',
      locale: (searchParams.get('locale') || 'en') as 'en' | 'es' | 'pt' | 'br',
      userRole: (searchParams.get('userRole') || 'patient') as 'patient' | 'expert' | 'admin',
      darkMode: searchParams.get('darkMode') === 'true',
      highContrast: searchParams.get('highContrast') === 'true',
      variant: (searchParams.get('variant') || 'default') as 'default' | 'minimal' | 'branded',
      type: searchParams.get('type') || 'welcome',
    };

    // Email content templates
    const emailContent = {
      welcome: {
        subject: {
          en: '🎉 Welcome to Eleva Care!',
          es: '🎉 ¡Bienvenido a Eleva Care!',
          pt: '🎉 Bem-vindo ao Eleva Care!',
          br: '🎉 Bem-vindo ao Eleva Care!',
        },
        preheader: {
          en: 'Your healthcare journey starts here',
          es: 'Tu viaje de salud comienza aquí',
          pt: 'A sua jornada de saúde começa aqui',
          br: 'Sua jornada de saúde começa aqui',
        },
        body: {
          en: `
            <div style="padding: 32px 0;">
              <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">Welcome to Eleva Care!</h1>
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
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 This is a test email sent via Resend API.<br/>
                📧 Template: ${config.variant} | 🌐 Locale: ${config.locale} | 👤 Role: ${config.userRole}<br/>
                🎨 Theme: ${config.darkMode ? 'Dark' : 'Light'}${config.highContrast ? ' + High Contrast' : ''}
              </p>
            </div>
          `,
        },
      },
      expert: {
        subject: {
          en: '👨‍⚕️ New Patient Consultation Request',
          es: '👨‍⚕️ Nueva Solicitud de Consulta',
          pt: '👨‍⚕️ Nova Solicitação de Consulta',
          br: '👨‍⚕️ Nova Solicitação de Consulta',
        },
        preheader: {
          en: 'A patient has requested your expertise',
          es: 'Un paciente ha solicitado tu experiencia',
          pt: 'Um paciente solicitou a sua expertise',
          br: 'Um paciente solicitou sua expertise',
        },
        body: {
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
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 This is a test email sent via Resend API.
              </p>
            </div>
          `,
        },
      },
      appointment: {
        subject: {
          en: '📅 Appointment Reminder - Tomorrow at 10:00 AM',
          es: '📅 Recordatorio de Cita - Mañana a las 10:00',
          pt: '📅 Lembrete de Consulta - Amanhã às 10:00',
          br: '📅 Lembrete de Consulta - Amanhã às 10:00',
        },
        preheader: {
          en: 'Your consultation with Dr. Silva is tomorrow',
          es: 'Tu consulta con Dr. Silva es mañana',
          pt: 'A sua consulta com Dr. Silva é amanhã',
          br: 'Sua consulta com Dr. Silva é amanhã',
        },
        body: {
          en: `
            <div style="padding: 32px 0;">
              <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">Appointment Reminder</h1>
              <div style="background: linear-gradient(135deg, #FFD23F, #F0C814); padding: 24px; border-radius: 12px; margin: 24px 0; color: #333;">
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
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 This is a test email sent via Resend API.
              </p>
            </div>
          `,
        },
      },
      payment: {
        subject: {
          en: '💳 Payment Confirmation - €45.00',
          es: '💳 Confirmación de Pago - €45.00',
          pt: '💳 Confirmação de Pagamento - €45.00',
          br: '💳 Confirmação de Pagamento - €45.00',
        },
        preheader: {
          en: 'Your payment was processed successfully',
          es: 'Tu pago fue procesado exitosamente',
          pt: 'O seu pagamento foi processado com sucesso',
          br: 'Seu pagamento foi processado com sucesso',
        },
        body: {
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
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 This is a test email sent via Resend API.
              </p>
            </div>
          `,
        },
      },
    };

    // Get content for the specified type
    const content = emailContent[config.type as keyof typeof emailContent] || emailContent.welcome;
    const subject = content.subject[config.locale] || content.subject.en;
    const preheader = content.preheader[config.locale] || content.preheader.en;
    const body = content.body[config.locale] || content.body.en;

    // Render options for the email template
    const renderOptions = {
      locale: config.locale,
      userRole: config.userRole,
      rtl: false,
      darkMode: config.darkMode,
      highContrast: config.highContrast,
      previewMode: false,
      variant: config.variant,
    };

    // Create the email component
    const EmailComponent = () =>
      React.createElement(
        BaseEmailTemplate,
        {
          subject: subject,
          preheader: preheader,
          renderOptions: renderOptions,
        },
        React.createElement('div', {
          dangerouslySetInnerHTML: { __html: body },
        }),
      );

    // Render the React component to HTML
    const html = render(React.createElement(EmailComponent));

    // Send via Resend
    const response = await resend.emails.send({
      from: 'Eleva Care Testing <testing@resend.dev>',
      to: [config.to],
      subject: `[TEST] ${subject}`,
      html: html,
      headers: {
        'X-Test-Type': config.type,
        'X-Template-Variant': config.variant,
        'X-User-Role': config.userRole,
        'X-Locale': config.locale,
        'X-Entity-Ref-ID': `api-test-${Date.now()}`, // Prevent Gmail threading
      },
      tags: [
        { name: 'environment', value: 'test' },
        { name: 'source', value: 'api' },
        { name: 'template-type', value: config.variant },
        { name: 'user-role', value: config.userRole },
        { name: 'locale', value: config.locale },
        { name: 'email-type', value: config.type },
      ],
    });

    if (response.error) {
      return NextResponse.json(
        {
          success: false,
          error: response.error.message,
          config,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      emailId: response.data.id,
      config,
      message: `Test email sent successfully to ${config.to}`,
      dashboardUrl: 'https://resend.com/emails',
    });
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to send test email',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/test-email - Send a test email with custom content
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      to = 'delivered@resend.dev',
      subject = 'Test Email from Eleva Care',
      content = '<h1>Hello from Eleva Care!</h1><p>This is a test email.</p>',
      locale = 'en',
      userRole = 'patient',
      darkMode = false,
      highContrast = false,
      variant = 'default',
    } = body;

    const renderOptions = {
      locale,
      userRole,
      rtl: false,
      darkMode,
      highContrast,
      previewMode: false,
      variant,
    };

    // Create the email component with custom content
    const EmailComponent = () =>
      React.createElement(
        BaseEmailTemplate,
        {
          subject: subject,
          preheader: 'Custom test email',
          renderOptions: renderOptions,
        },
        React.createElement('div', {
          dangerouslySetInnerHTML: { __html: content },
        }),
      );

    // Render the React component to HTML
    const html = render(React.createElement(EmailComponent));

    // Send via Resend
    const response = await resend.emails.send({
      from: 'Eleva Care Testing <testing@resend.dev>',
      to: [to],
      subject: `[TEST] ${subject}`,
      html: html,
      headers: {
        'X-Test-Type': 'custom',
        'X-Template-Variant': variant,
        'X-User-Role': userRole,
        'X-Locale': locale,
        'X-Entity-Ref-ID': `api-custom-${Date.now()}`,
      },
      tags: [
        { name: 'environment', value: 'test' },
        { name: 'source', value: 'api-custom' },
        { name: 'template-type', value: variant },
        { name: 'user-role', value: userRole },
        { name: 'locale', value: locale },
      ],
    });

    if (response.error) {
      return NextResponse.json(
        {
          success: false,
          error: response.error.message,
          config: { to, subject, locale, userRole, darkMode, highContrast, variant },
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      emailId: response.data.id,
      config: { to, subject, locale, userRole, darkMode, highContrast, variant },
      message: `Custom test email sent successfully to ${to}`,
      dashboardUrl: 'https://resend.com/emails',
    });
  } catch (error) {
    console.error('Custom email test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to send custom test email',
      },
      { status: 500 },
    );
  }
}
