// Import our email template components
import { BaseEmailTemplate } from '@/lib/email-templates/components/BaseEmailTemplate';
import { render } from '@react-email/render';
import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Type definitions for email content structure
type LocalizedContent = {
  en: string;
  es: string;
  pt: string;
  br: string;
};

type EmailContentType = {
  subject: LocalizedContent;
  preheader: LocalizedContent;
  body: LocalizedContent;
};

/**
 * Handles GET requests to send a test email using predefined, localized templates.
 *
 * Selects an email template based on query parameters for recipient, locale, user role, dark mode, high contrast, template variant, and email type. Renders the email using a React component and sends it via the Resend API. Returns a JSON response indicating success or failure, along with relevant metadata.
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

    // Email content templates with proper typing
    const emailContent: Record<string, EmailContentType> = {
      welcome: {
        subject: {
          en: 'Welcome to Eleva Care - Your Health Journey Begins',
          es: 'Bienvenido a Eleva Care - Tu Viaje de Salud Comienza',
          pt: 'Bem-vindo ao Eleva Care - Sua Jornada de Saúde Começa',
          br: 'Bem-vindo ao Eleva Care - Sua Jornada de Saúde Começa',
        },
        preheader: {
          en: 'Get started with personalized healthcare from trusted experts',
          es: 'Comienza con atención médica personalizada de expertos de confianza',
          pt: 'Comece com cuidados de saúde personalizados de especialistas confiáveis',
          br: 'Comece com cuidados de saúde personalizados de especialistas confiáveis',
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
                🧪 This is a test email sent via Resend API.
              </p>
            </div>
          `,
          es: `
            <div style="padding: 32px 0;">
              <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">¡Bienvenido a Eleva Care!</h1>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                Nos emociona tenerte en nuestra comunidad de excelencia en salud. Tu viaje hacia una mejor salud comienza aquí.
              </p>
              <div style="background: #F7F9F9; padding: 24px; border-radius: 8px; margin: 24px 0;">
                <h3 style="color: #006D77; margin-bottom: 12px;">¿Qué sigue?</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Completa tu perfil de salud</li>
                  <li>Explora nuestros profesionales de salud expertos</li>
                  <li>Programa tu primera consulta</li>
                </ul>
              </div>
              <p style="margin-bottom: 24px;">
                <a href="https://eleva-care.com/dashboard" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Comenzar →
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 Este es un correo de prueba enviado vía Resend API.
              </p>
            </div>
          `,
          pt: `
            <div style="padding: 32px 0;">
              <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">Bem-vindo ao Eleva Care!</h1>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                Estamos entusiasmados por tê-lo na nossa comunidade de excelência em saúde. A sua jornada para uma melhor saúde começa aqui.
              </p>
              <div style="background: #F7F9F9; padding: 24px; border-radius: 8px; margin: 24px 0;">
                <h3 style="color: #006D77; margin-bottom: 12px;">O que vem a seguir?</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Complete o seu perfil de saúde</li>
                  <li>Explore os nossos profissionais de saúde especialistas</li>
                  <li>Agende a sua primeira consulta</li>
                </ul>
              </div>
              <p style="margin-bottom: 24px;">
                <a href="https://eleva-care.com/dashboard" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Começar →
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 Este é um email de teste enviado via Resend API.
              </p>
            </div>
          `,
          br: `
            <div style="padding: 32px 0;">
              <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">Bem-vindo ao Eleva Care!</h1>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                Estamos empolgados em tê-lo em nossa comunidade de excelência em saúde. Sua jornada para uma melhor saúde começa aqui.
              </p>
              <div style="background: #F7F9F9; padding: 24px; border-radius: 8px; margin: 24px 0;">
                <h3 style="color: #006D77; margin-bottom: 12px;">O que vem a seguir?</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Complete seu perfil de saúde</li>
                  <li>Navegue pelos nossos profissionais de saúde especialistas</li>
                  <li>Agende sua primeira consulta</li>
                </ul>
              </div>
              <p style="margin-bottom: 24px;">
                <a href="https://eleva-care.com/dashboard" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Começar →
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 Este é um email de teste enviado via Resend API.
              </p>
            </div>
          `,
        },
      },
      expert: {
        subject: {
          en: 'New Patient Consultation Request - Eleva Care',
          es: 'Nueva Solicitud de Consulta de Paciente - Eleva Care',
          pt: 'Nova Solicitação de Consulta de Paciente - Eleva Care',
          br: 'Nova Solicitação de Consulta de Paciente - Eleva Care',
        },
        preheader: {
          en: 'A patient has requested a consultation with you',
          es: 'Un paciente ha solicitado una consulta contigo',
          pt: 'Um paciente solicitou uma consulta consigo',
          br: 'Um paciente solicitou uma consulta com você',
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
                  Review Request →
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 This is a test email sent via Resend API.
              </p>
            </div>
          `,
          es: `
            <div style="padding: 32px 0;">
              <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">Nueva Solicitud de Consulta</h1>
              <div style="background: #E0FBFC; border-left: 4px solid #006D77; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Detalles del Paciente:</h3>
                <p><strong>Nombre:</strong> Sarah Johnson</p>
                <p><strong>Edad:</strong> 34</p>
                <p><strong>Condición:</strong> Consulta de manejo de estrés</p>
                <p><strong>Fecha Preferida:</strong> Mañana, 10:00 AM</p>
              </div>
              <p>El paciente ha solicitado específicamente tu experiencia basándose en tu especialización en manejo de estrés y bienestar mental.</p>
              <p style="margin-bottom: 24px;">
                <a href="https://eleva-care.com/expert/consultations" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Revisar Solicitud →
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 Este es un correo de prueba enviado vía Resend API.
              </p>
            </div>
          `,
          pt: `
            <div style="padding: 32px 0;">
              <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">Nova Solicitação de Consulta</h1>
              <div style="background: #E0FBFC; border-left: 4px solid #006D77; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Detalhes do Paciente:</h3>
                <p><strong>Nome:</strong> Sarah Johnson</p>
                <p><strong>Idade:</strong> 34</p>
                <p><strong>Condição:</strong> Consulta de gestão de stress</p>
                <p><strong>Data Preferida:</strong> Amanhã, 10:00</p>
              </div>
              <p>O paciente solicitou especificamente a sua experiência com base na sua especialização em gestão de stress e bem-estar mental.</p>
              <p style="margin-bottom: 24px;">
                <a href="https://eleva-care.com/expert/consultations" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Revisar Solicitação →
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 Este é um email de teste enviado via Resend API.
              </p>
            </div>
          `,
          br: `
            <div style="padding: 32px 0;">
              <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">Nova Solicitação de Consulta</h1>
              <div style="background: #E0FBFC; border-left: 4px solid #006D77; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Detalhes do Paciente:</h3>
                <p><strong>Nome:</strong> Sarah Johnson</p>
                <p><strong>Idade:</strong> 34</p>
                <p><strong>Condição:</strong> Consulta de gerenciamento de estresse</p>
                <p><strong>Data Preferida:</strong> Amanhã, 10:00</p>
              </div>
              <p>O paciente solicitou especificamente sua experiência com base em sua especialização em gerenciamento de estresse e bem-estar mental.</p>
              <p style="margin-bottom: 24px;">
                <a href="https://eleva-care.com/expert/consultations" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Revisar Solicitação →
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 Este é um email de teste enviado via Resend API.
              </p>
            </div>
          `,
        },
      },
      appointment: {
        subject: {
          en: 'Appointment Reminder - Tomorrow at 10:00 AM',
          es: 'Recordatorio de Cita - Mañana a las 10:00 AM',
          pt: 'Lembrete de Consulta - Amanhã às 10:00',
          br: 'Lembrete de Consulta - Amanhã às 10:00',
        },
        preheader: {
          en: 'Your consultation with Dr. Maria Silva is tomorrow',
          es: 'Tu consulta con la Dra. Maria Silva es mañana',
          pt: 'A sua consulta com a Dr.ª Maria Silva é amanhã',
          br: 'Sua consulta com a Dra. Maria Silva é amanhã',
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
                <li>Find a quiet, private space</li>
                <li>Test your camera and microphone</li>
                <li>Prepare any questions you want to ask</li>
                <li>Have your health records ready</li>
              </ul>
              <p style="margin-bottom: 24px;">
                <a href="https://eleva-care.com/appointments/join" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                  Join Meeting →
                </a>
                <a href="https://eleva-care.com/appointments/reschedule" style="background: #E29578; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Reschedule
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 This is a test email sent via Resend API.
              </p>
            </div>
          `,
          es: `
            <div style="padding: 32px 0;">
              <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">Recordatorio de Cita</h1>
              <div style="background: linear-gradient(135deg, #FFD23F, #F0C814); padding: 24px; border-radius: 12px; margin: 24px 0; color: #333;">
                <h3 style="margin-top: 0; color: #333;">📅 Mañana a las 10:00 AM</h3>
                <p style="margin: 8px 0; color: #333;"><strong>Especialista:</strong> Dra. Maria Silva</p>
                <p style="margin: 8px 0; color: #333;"><strong>Especialización:</strong> Salud Mental y Bienestar</p>
                <p style="margin: 8px 0; color: #333;"><strong>Duración:</strong> 45 minutos</p>
                <p style="margin: 8px 0; color: #333;"><strong>Tipo:</strong> Consulta por video</p>
              </div>
              <h3>Consejos de Preparación:</h3>
              <ul>
                <li>Encuentra un espacio silencioso y privado</li>
                <li>Prueba tu cámara y micrófono</li>
                <li>Prepara cualquier pregunta que quieras hacer</li>
                <li>Ten tus registros de salud listos</li>
              </ul>
              <p style="margin-bottom: 24px;">
                <a href="https://eleva-care.com/appointments/join" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                  Unirse a la Reunión →
                </a>
                <a href="https://eleva-care.com/appointments/reschedule" style="background: #E29578; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Reprogramar
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 Este es un correo de prueba enviado vía Resend API.
              </p>
            </div>
          `,
          pt: `
            <div style="padding: 32px 0;">
              <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">Lembrete de Consulta</h1>
              <div style="background: linear-gradient(135deg, #FFD23F, #F0C814); padding: 24px; border-radius: 12px; margin: 24px 0; color: #333;">
                <h3 style="margin-top: 0; color: #333;">📅 Amanhã às 10:00</h3>
                <p style="margin: 8px 0; color: #333;"><strong>Especialista:</strong> Dr.ª Maria Silva</p>
                <p style="margin: 8px 0; color: #333;"><strong>Especialização:</strong> Saúde Mental e Bem-estar</p>
                <p style="margin: 8px 0; color: #333;"><strong>Duração:</strong> 45 minutos</p>
                <p style="margin: 8px 0; color: #333;"><strong>Tipo:</strong> Consulta por vídeo</p>
              </div>
              <h3>Dicas de Preparação:</h3>
              <ul>
                <li>Encontre um espaço silencioso e privado</li>
                <li>Teste a sua câmara e microfone</li>
                <li>Prepare quaisquer perguntas que queira fazer</li>
                <li>Tenha os seus registos de saúde prontos</li>
              </ul>
              <p style="margin-bottom: 24px;">
                <a href="https://eleva-care.com/appointments/join" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                  Entrar na Reunião →
                </a>
                <a href="https://eleva-care.com/appointments/reschedule" style="background: #E29578; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Reagendar
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 Este é um email de teste enviado via Resend API.
              </p>
            </div>
          `,
          br: `
            <div style="padding: 32px 0;">
              <h1 style="color: #006D77; font-size: 28px; margin-bottom: 16px;">Lembrete de Consulta</h1>
              <div style="background: linear-gradient(135deg, #FFD23F, #F0C814); padding: 24px; border-radius: 12px; margin: 24px 0; color: #333;">
                <h3 style="margin-top: 0; color: #333;">📅 Amanhã às 10:00</h3>
                <p style="margin: 8px 0; color: #333;"><strong>Especialista:</strong> Dra. Maria Silva</p>
                <p style="margin: 8px 0; color: #333;"><strong>Especialização:</strong> Saúde Mental e Bem-estar</p>
                <p style="margin: 8px 0; color: #333;"><strong>Duração:</strong> 45 minutos</p>
                <p style="margin: 8px 0; color: #333;"><strong>Tipo:</strong> Consulta por vídeo</p>
              </div>
              <h3>Dicas de Preparação:</h3>
              <ul>
                <li>Encontre um espaço silencioso e privado</li>
                <li>Teste sua câmera e microfone</li>
                <li>Prepare qualquer pergunta que queira fazer</li>
                <li>Tenha seus registros de saúde prontos</li>
              </ul>
              <p style="margin-bottom: 24px;">
                <a href="https://eleva-care.com/appointments/join" style="background: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                  Entrar na Reunião →
                </a>
                <a href="https://eleva-care.com/appointments/reschedule" style="background: #E29578; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Reagendar
                </a>
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 Este é um email de teste enviado via Resend API.
              </p>
            </div>
          `,
        },
      },
      payment: {
        subject: {
          en: 'Payment Confirmation - Eleva Care',
          es: 'Confirmación de Pago - Eleva Care',
          pt: 'Confirmação de Pagamento - Eleva Care',
          br: 'Confirmação de Pagamento - Eleva Care',
        },
        preheader: {
          en: 'Your payment has been processed successfully',
          es: 'Tu pago ha sido procesado exitosamente',
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
          es: `
            <div style="padding: 32px 0;">
              <h1 style="color: #006D77; font-size: 24px; margin-bottom: 16px;">Pago Confirmado</h1>
              <div style="background: #E8F5E8; border-left: 4px solid #28A745; padding: 20px; margin: 20px 0;">
                <h3 style="color: #28A745; margin-top: 0;">✅ Transacción Exitosa</h3>
                <p><strong>Cantidad:</strong> €45.00</p>
                <p><strong>Servicio:</strong> Consulta de Salud Mental</p>
                <p><strong>Especialista:</strong> Dra. Maria Silva</p>
                <p><strong>ID de Transacción:</strong> TXN-2024-001234</p>
                <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p>Tu consulta está ahora confirmada. Recibirás una invitación de calendario pronto.</p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 Este es un correo de prueba enviado vía Resend API.
              </p>
            </div>
          `,
          pt: `
            <div style="padding: 32px 0;">
              <h1 style="color: #006D77; font-size: 24px; margin-bottom: 16px;">Pagamento Confirmado</h1>
              <div style="background: #E8F5E8; border-left: 4px solid #28A745; padding: 20px; margin: 20px 0;">
                <h3 style="color: #28A745; margin-top: 0;">✅ Transação Bem-sucedida</h3>
                <p><strong>Quantia:</strong> €45.00</p>
                <p><strong>Serviço:</strong> Consulta de Saúde Mental</p>
                <p><strong>Especialista:</strong> Dr.ª Maria Silva</p>
                <p><strong>ID da Transação:</strong> TXN-2024-001234</p>
                <p><strong>Data:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p>A sua consulta está agora confirmada. Receberá um convite de calendário em breve.</p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 Este é um email de teste enviado via Resend API.
              </p>
            </div>
          `,
          br: `
            <div style="padding: 32px 0;">
              <h1 style="color: #006D77; font-size: 24px; margin-bottom: 16px;">Pagamento Confirmado</h1>
              <div style="background: #E8F5E8; border-left: 4px solid #28A745; padding: 20px; margin: 20px 0;">
                <h3 style="color: #28A745; margin-top: 0;">✅ Transação Bem-sucedida</h3>
                <p><strong>Valor:</strong> €45.00</p>
                <p><strong>Serviço:</strong> Consulta de Saúde Mental</p>
                <p><strong>Especialista:</strong> Dra. Maria Silva</p>
                <p><strong>ID da Transação:</strong> TXN-2024-001234</p>
                <p><strong>Data:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p>Sua consulta está agora confirmada. Você receberá um convite de calendário em breve.</p>
              <p style="color: #666; font-size: 14px; margin-top: 32px;">
                🧪 Este é um email de teste enviado via Resend API.
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

    // Create the email component with proper children prop structure
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
    const html = await render(React.createElement(EmailComponent));

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
      emailId: response.data?.id,
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
 * Handles POST requests to send a custom test email using the Resend service.
 *
 * Expects a JSON body with optional fields for recipient, subject, HTML content, locale, user role, dark mode, high contrast, and template variant. Renders the provided content within a base email template and sends the email with tracking headers and tags. Returns a JSON response indicating success or failure, including configuration details and a dashboard URL on success.
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

    // Create the email component with custom content and proper children prop structure
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
    const html = await render(React.createElement(EmailComponent));

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
      emailId: response.data?.id,
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
