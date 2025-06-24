import type { EmailContentType } from './types';

export const paymentTemplate: EmailContentType = {
  subject: {
    en: 'Payment Confirmation - Eleva Care',
    es: 'Confirmación de Pago - Eleva Care',
    pt: 'Confirmação de Pagamento - Eleva Care',
    'pt-BR': 'Confirmação de Pagamento - Eleva Care',
  },
  preheader: {
    en: 'Your payment has been processed successfully',
    es: 'Tu pago ha sido procesado exitosamente',
    pt: 'O seu pagamento foi processado com sucesso',
    'pt-BR': 'Seu pagamento foi processado com sucesso',
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
    'pt-BR': `
      <div style="padding: 32px 0;">
        <h1 style="color: #006D77; font-size: 24px; margin-bottom: 16px;">Pagamento Confirmado</h1>
        <div style="background: #E8F5E8; border-left: 4px solid #28A745; padding: 20px; margin: 20px 0;">
          <h3 style="color: #28A745; margin-top: 0;">✅ Transação Bem-sucedida</h3>
          <p><strong>Quantia:</strong> €45.00</p>
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
};
