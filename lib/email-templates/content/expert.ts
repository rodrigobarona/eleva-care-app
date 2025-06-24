import type { EmailContentType } from './types';

export const expertTemplate: EmailContentType = {
  subject: {
    en: 'New Patient Consultation Request - Eleva Care',
    es: 'Nueva Solicitud de Consulta de Paciente - Eleva Care',
    pt: 'Nova Solicitação de Consulta de Paciente - Eleva Care',
    'pt-BR': 'Nova Solicitação de Consulta de Paciente - Eleva Care',
  },
  preheader: {
    en: 'A patient has requested a consultation with you',
    es: 'Un paciente ha solicitado una consulta contigo',
    pt: 'Um paciente solicitou uma consulta consigo',
    'pt-BR': 'Um paciente solicitou uma consulta com você',
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
    'pt-BR': `
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
};
