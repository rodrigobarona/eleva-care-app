import type { EmailContentType } from './types';

export const welcomeTemplate: EmailContentType = {
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
};
