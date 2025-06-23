import type { EmailContentType } from './types';

export const appointmentTemplate: EmailContentType = {
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
};
