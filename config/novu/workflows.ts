import { workflow } from '@novu/framework';
import { z } from 'zod';

/**
 * Multilingual Novu Workflows for Eleva Care
 * Generated with next-intl translations
 *
 * Supported languages: en, pt, es, br
 */

/**
 * EN - Welcome Workflow - Onboards new users to Eleva Care
 */
export const welcomeWorkflowEN = workflow(
  'user-welcome-en',
  async ({ step, payload }) => {
    // In-app notification
    await step.inApp('welcome-message', async () => ({
      subject: 'Welcome to Eleva Care, {userName}!',
      body: `Hi {userName}! Welcome to Eleva Care. We're excited to help you on your healthcare journey.`,
      avatar: 'https://eleva.care/logo.png',
      primaryAction: {
        label: 'Complete Your Profile',
        redirect: {
          url: payload.profileUrl,
          target: '_self',
        },
      },
    }));

    // Welcome email
    await step.email('welcome-email', async () => ({
      subject: 'Welcome to Eleva Care!',
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>Welcome to Eleva Care!</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hi {firstName},{{payload.firstName}}</p>
          <p>Thank you for joining our healthcare platform. We're excited to help you on your wellness journey.</p>
          <h3>Next Steps:</h3>
          <ul>
            <li>Complete your profile</li><li>Browse available experts</li><li>Book your first consultation</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.profileUrl}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Complete Your Profile
            </a>
          </div>
          <p>Best regards,<br>The Eleva Care Team</p>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      firstName: z.string(),
      profileUrl: z.string().url().default('/profile'),
    }),
    name: 'Welcome Workflow (EN)',
    description: 'Welcome new users to Eleva Care platform',
    tags: ['user-onboarding', 'welcome', 'en'],
    preferences: {
      all: { enabled: true, readOnly: false },
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * EN - Payment Success Workflow - Confirms successful payments
 */
export const paymentSuccessWorkflowEN = workflow(
  'payment-success-en',
  async ({ step, payload }) => {
    // In-app confirmation
    await step.inApp('payment-confirmation', async () => ({
      subject: 'Payment successful!',
      body: `Your payment of {amount} for {planName} has been processed successfully.`,
    }));

    // Email receipt
    await step.email('payment-receipt', async () => ({
      subject: `Payment Confirmation - ${payload.amount}`,
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
          <h1>Payment Confirmation</h1>
        </div>
        <div style="padding: 20px;">
          <p>Your payment has been successfully processed.</p>
          <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3>Payment Details:</h3>
            <p><strong>Amount:</strong> {{payload.amount}}</p>
            <p><strong>Plan:</strong> {{payload.planName}}</p>
            <p><strong>Date:</strong> {{payload.paymentDate}}</p>
            <p><strong>Transaction ID:</strong> {{payload.transactionId}}</p>
          </div>
          <p>Thank you for your payment!</p>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      planName: z.string(),
      paymentDate: z.string(),
      transactionId: z.string(),
    }),
    name: 'Payment Success Workflow (EN)',
    description: 'Confirm successful payments to users',
    tags: ['payments', 'confirmation', 'en'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * EN - Payment Failed Workflow - Alerts users of failed payments
 */
export const paymentFailedWorkflowEN = workflow(
  'payment-failed-en',
  async ({ step, payload }) => {
    // In-app alert
    await step.inApp('payment-failure', async () => ({
      subject: 'Payment failed',
      body: `We couldn't process your payment of {amount}. Please check your payment method and try again.`,
      primaryAction: {
        label: 'Update Payment Method',
        redirect: {
          url: payload.billingUrl,
          target: '_self',
        },
      },
    }));

    // Email alert
    await step.email('payment-failure-email', async () => ({
      subject: 'Payment Failed - Action Required',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1>Payment Failed</h1>
          </div>
          <div style="padding: 20px;">
            <p>We were unable to process your payment of ${payload.amount}.</p>
            <p><strong>Reason:</strong> ${payload.reason}</p>
            <p>Please update your payment method and try again.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${payload.billingUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method</a>
            </div>
          </div>
        </div>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      reason: z.string(),
      billingUrl: z.string().url().default('/billing'),
    }),
    name: 'Payment Failed Workflow (EN)',
    description: 'Alert users of failed payments',
    tags: ['payments', 'alerts', 'en'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * EN - Appointment Reminder Workflow - 24-hour appointment reminders
 */
export const appointmentReminderWorkflowEN = workflow(
  'appointment-reminder-24hr-en',
  async ({ step, payload }) => {
    // In-app reminder
    await step.inApp('appointment-reminder-notification', async () => ({
      subject: 'Reminder: Your appointment is {timeUntilAppointment}',
      body: `Your {appointmentType} with {expertName} is {timeUntilAppointment} on {appointmentDate} at {appointmentTime}.`,
      primaryAction: {
        label: 'Join your meeting',
        redirect: {
          url: payload.meetingLink,
          target: '_blank',
        },
      },
    }));

    // Email reminder
    await step.email('appointment-reminder-email', async () => ({
      subject: `Reminder: Your Eleva Care Appointment is {timeUntilAppointment}`,
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>Appointment Reminder</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hi {userName},{{payload.userName}}</p>
          <p>This is a friendly reminder that your {appointmentType} with {expertName} is {timeUntilAppointment}, on {appointmentDate} at {appointmentTime}.</p>
          <div style="background-color: #e8f5f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3>Appointment Details:</h3>
            <p><strong>Expert:</strong> {{payload.expertName}}</p>
            <p><strong>Date:</strong> {{payload.appointmentDate}}</p>
            <p><strong>Time:</strong> {{payload.appointmentTime}}</p>
            <p><strong>Type:</strong> {{payload.appointmentType}}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.meetingLink}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Join your meeting
            </a>
          </div>
          <p><small>Please ensure you are in a quiet place with a stable internet connection.</small></p>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      expertName: z.string(),
      appointmentType: z.string(),
      timeUntilAppointment: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      meetingLink: z.string().url(),
    }),
    name: 'Appointment Reminder Workflow (EN)',
    description: '24-hour appointment reminders',
    tags: ['appointments', 'reminders', 'en'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * EN - Expert Onboarding Complete Workflow - Welcome experts when approved
 */
export const expertOnboardingCompleteWorkflowEN = workflow(
  'expert-onboarding-complete-en',
  async ({ step, payload }) => {
    // In-app notification
    await step.inApp('onboarding-complete', async () => ({
      subject: 'Expert setup complete!',
      body: `Congratulations {expertName}! Your expert profile is now live. You can start receiving bookings from clients.`,
      primaryAction: {
        label: 'Go to Dashboard',
        redirect: {
          url: payload.dashboardUrl,
          target: '_self',
        },
      },
    }));

    // Welcome email
    await step.email('expert-welcome-email', async () => ({
      subject: 'Welcome to the Eleva Care Expert Network!',
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>Congratulations, {expertName}!</h1>
        </div>
        <div style="padding: 20px;">
          <p>Your expert profile is now active on Eleva Care.</p>
          <p><strong>Specialization: {specialization}</strong></p>
          <h3>You can now:</h3>
          <ul>
            <li>Receive client bookings</li><li>Manage your availability</li><li>Track your earnings</li><li>Build your client base</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.dashboardUrl}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      expertName: z.string(),
      specialization: z.string(),
      dashboardUrl: z.string().url().default('/dashboard'),
    }),
    name: 'Expert Onboarding Complete Workflow (EN)',
    description: 'Welcome experts when their profile is approved',
    tags: ['experts', 'onboarding', 'en'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * EN - Health Check Failure Workflow - Alert administrators of system health issues
 */
export const healthCheckFailureWorkflowEN = workflow(
  'health-check-failure-en',
  async ({ step, payload }) => {
    // In-app alert for admins
    await step.inApp('health-check-alert', async () => ({
      subject: '⚠️ Health Check Failure',
      body: `⚠️ Health Check Failure: ${payload.environment} - ${payload.status}. Error: ${payload.error}`,
    }));

    // Email alert for admins
    await step.email('health-check-alert-email', async () => ({
      subject: `⚠️ Eleva Care Health Check Failure - ${payload.environment}`,
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1>⚠️ Health Check Failure Alert</h1>
        </div>
        <div style="padding: 20px;">
          <p>A health check failure has been detected in the Eleva Care application.</p>
          <h3>System Details</h3>
          <ul>
            <li><strong>Status:</strong> {{payload.status}}</li>
            <li><strong>Error:</strong> {{payload.error}}</li>
            <li><strong>Environment:</strong> {{payload.environment}}</li>
            <li><strong>Timestamp:</strong> {{payload.timestamp}}</li>
            <li><strong>Version:</strong> {{payload.version}}</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.monitoringUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Monitoring Dashboard</a>
          </div>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      status: z.string(),
      error: z.string(),
      environment: z.string(),
      timestamp: z.string(),
      version: z.string(),
      memory: z.object({
        used: z.number(),
        total: z.number(),
        percentage: z.number(),
      }),
      monitoringUrl: z.string().url().default('/admin/monitoring'),
    }),
    name: 'Health Check Failure Workflow (EN)',
    description: 'Alert administrators of system health issues',
    tags: ['system', 'alerts', 'monitoring', 'en'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);
/**
 * PT - Welcome Workflow - Onboards new users to Eleva Care
 */
export const welcomeWorkflowPT = workflow(
  'user-welcome-pt',
  async ({ step, payload }) => {
    // In-app notification
    await step.inApp('welcome-message', async () => ({
      subject: 'Bem-vindo à Eleva Care, {userName}!',
      body: `Olá {userName}! Bem-vindo à Eleva Care. Estamos entusiasmados em ajudá-lo na sua jornada de saúde.`,
      avatar: 'https://eleva.care/logo.png',
      primaryAction: {
        label: 'Complete o Seu Perfil',
        redirect: {
          url: payload.profileUrl,
          target: '_self',
        },
      },
    }));

    // Welcome email
    await step.email('welcome-email', async () => ({
      subject: 'Bem-vindo à Eleva Care!',
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>Bem-vindo à Eleva Care!</h1>
        </div>
        <div style="padding: 20px;">
          <p>Olá {firstName},{{payload.firstName}}</p>
          <p>Obrigado por se juntar à nossa plataforma de saúde. Estamos entusiasmados em ajudá-lo na sua jornada de bem-estar.</p>
          <h3>Próximos Passos:</h3>
          <ul>
            <li>Complete o seu perfil</li><li>Navegue pelos especialistas disponíveis</li><li>Marque a sua primeira consulta</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.profileUrl}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Complete o Seu Perfil
            </a>
          </div>
          <p>Best regards,<br>The Eleva Care Team</p>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      firstName: z.string(),
      profileUrl: z.string().url().default('/profile'),
    }),
    name: 'Welcome Workflow (PT)',
    description: 'Welcome new users to Eleva Care platform',
    tags: ['user-onboarding', 'welcome', 'pt'],
    preferences: {
      all: { enabled: true, readOnly: false },
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * PT - Payment Success Workflow - Confirms successful payments
 */
export const paymentSuccessWorkflowPT = workflow(
  'payment-success-pt',
  async ({ step, payload }) => {
    // In-app confirmation
    await step.inApp('payment-confirmation', async () => ({
      subject: 'Pagamento bem-sucedido!',
      body: `O seu pagamento de {amount} para {planName} foi processado com sucesso.`,
    }));

    // Email receipt
    await step.email('payment-receipt', async () => ({
      subject: `Payment Confirmation - ${payload.amount}`,
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
          <h1>Payment Confirmation</h1>
        </div>
        <div style="padding: 20px;">
          <p>Your payment has been successfully processed.</p>
          <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3>Payment Details:</h3>
            <p><strong>Amount:</strong> {{payload.amount}}</p>
            <p><strong>Plan:</strong> {{payload.planName}}</p>
            <p><strong>Date:</strong> {{payload.paymentDate}}</p>
            <p><strong>Transaction ID:</strong> {{payload.transactionId}}</p>
          </div>
          <p>Thank you for your payment!</p>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      planName: z.string(),
      paymentDate: z.string(),
      transactionId: z.string(),
    }),
    name: 'Payment Success Workflow (PT)',
    description: 'Confirm successful payments to users',
    tags: ['payments', 'confirmation', 'pt'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * PT - Payment Failed Workflow - Alerts users of failed payments
 */
export const paymentFailedWorkflowPT = workflow(
  'payment-failed-pt',
  async ({ step, payload }) => {
    // In-app alert
    await step.inApp('payment-failure', async () => ({
      subject: 'Falha no pagamento',
      body: `Não conseguimos processar o seu pagamento de {amount}. Por favor, verifique o seu método de pagamento e tente novamente.`,
      primaryAction: {
        label: 'Update Payment Method',
        redirect: {
          url: payload.billingUrl,
          target: '_self',
        },
      },
    }));

    // Email alert
    await step.email('payment-failure-email', async () => ({
      subject: 'Payment Failed - Action Required',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1>Payment Failed</h1>
          </div>
          <div style="padding: 20px;">
            <p>We were unable to process your payment of ${payload.amount}.</p>
            <p><strong>Reason:</strong> ${payload.reason}</p>
            <p>Please update your payment method and try again.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${payload.billingUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method</a>
            </div>
          </div>
        </div>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      reason: z.string(),
      billingUrl: z.string().url().default('/billing'),
    }),
    name: 'Payment Failed Workflow (PT)',
    description: 'Alert users of failed payments',
    tags: ['payments', 'alerts', 'pt'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * PT - Appointment Reminder Workflow - 24-hour appointment reminders
 */
export const appointmentReminderWorkflowPT = workflow(
  'appointment-reminder-24hr-pt',
  async ({ step, payload }) => {
    // In-app reminder
    await step.inApp('appointment-reminder-notification', async () => ({
      subject: 'Lembrete: A sua consulta é {timeUntilAppointment}',
      body: `A sua {appointmentType} com {expertName} é {timeUntilAppointment} no dia {appointmentDate} às {appointmentTime}.`,
      primaryAction: {
        label: 'Aceda à sua consulta',
        redirect: {
          url: payload.meetingLink,
          target: '_blank',
        },
      },
    }));

    // Email reminder
    await step.email('appointment-reminder-email', async () => ({
      subject: `Lembrete: A sua consulta da Eleva Care é {timeUntilAppointment}`,
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>Lembrete de Consulta</h1>
        </div>
        <div style="padding: 20px;">
          <p>Olá {userName},{{payload.userName}}</p>
          <p>Este é um lembrete amigável de que a sua {appointmentType} com {expertName} é {timeUntilAppointment}, no dia {appointmentDate} às {appointmentTime}.</p>
          <div style="background-color: #e8f5f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3>Appointment Details:</h3>
            <p><strong>Expert:</strong> {{payload.expertName}}</p>
            <p><strong>Date:</strong> {{payload.appointmentDate}}</p>
            <p><strong>Time:</strong> {{payload.appointmentTime}}</p>
            <p><strong>Type:</strong> {{payload.appointmentType}}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.meetingLink}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Aceda à sua consulta
            </a>
          </div>
          <p><small>Por favor, certifique-se de que está num local sossegado com uma ligação estável à internet.</small></p>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      expertName: z.string(),
      appointmentType: z.string(),
      timeUntilAppointment: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      meetingLink: z.string().url(),
    }),
    name: 'Appointment Reminder Workflow (PT)',
    description: '24-hour appointment reminders',
    tags: ['appointments', 'reminders', 'pt'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * PT - Expert Onboarding Complete Workflow - Welcome experts when approved
 */
export const expertOnboardingCompleteWorkflowPT = workflow(
  'expert-onboarding-complete-pt',
  async ({ step, payload }) => {
    // In-app notification
    await step.inApp('onboarding-complete', async () => ({
      subject: 'Configuração de especialista concluída!',
      body: `Parabéns {expertName}! O seu perfil de especialista está agora ativo. Pode começar a receber marcações de clientes.`,
      primaryAction: {
        label: 'Ir para o Painel',
        redirect: {
          url: payload.dashboardUrl,
          target: '_self',
        },
      },
    }));

    // Welcome email
    await step.email('expert-welcome-email', async () => ({
      subject: 'Bem-vindo à Rede de Especialistas da Eleva Care!',
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>Parabéns, {expertName}!</h1>
        </div>
        <div style="padding: 20px;">
          <p>O seu perfil de especialista está agora ativo na Eleva Care.</p>
          <p><strong>Especialização: {specialization}</strong></p>
          <h3>Agora pode:</h3>
          <ul>
            <li>Receber marcações de clientes</li><li>Gerir a sua disponibilidade</li><li>Acompanhar os seus ganhos</li><li>Construir a sua base de clientes</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.dashboardUrl}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Ir para o Painel
            </a>
          </div>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      expertName: z.string(),
      specialization: z.string(),
      dashboardUrl: z.string().url().default('/dashboard'),
    }),
    name: 'Expert Onboarding Complete Workflow (PT)',
    description: 'Welcome experts when their profile is approved',
    tags: ['experts', 'onboarding', 'pt'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * PT - Health Check Failure Workflow - Alert administrators of system health issues
 */
export const healthCheckFailureWorkflowPT = workflow(
  'health-check-failure-pt',
  async ({ step, payload }) => {
    // In-app alert for admins
    await step.inApp('health-check-alert', async () => ({
      subject: '⚠️ Health Check Failure',
      body: `⚠️ Health Check Failure: ${payload.environment} - ${payload.status}. Error: ${payload.error}`,
    }));

    // Email alert for admins
    await step.email('health-check-alert-email', async () => ({
      subject: `⚠️ Eleva Care Health Check Failure - ${payload.environment}`,
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1>⚠️ Health Check Failure Alert</h1>
        </div>
        <div style="padding: 20px;">
          <p>A health check failure has been detected in the Eleva Care application.</p>
          <h3>System Details</h3>
          <ul>
            <li><strong>Status:</strong> {{payload.status}}</li>
            <li><strong>Error:</strong> {{payload.error}}</li>
            <li><strong>Environment:</strong> {{payload.environment}}</li>
            <li><strong>Timestamp:</strong> {{payload.timestamp}}</li>
            <li><strong>Version:</strong> {{payload.version}}</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.monitoringUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Monitoring Dashboard</a>
          </div>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      status: z.string(),
      error: z.string(),
      environment: z.string(),
      timestamp: z.string(),
      version: z.string(),
      memory: z.object({
        used: z.number(),
        total: z.number(),
        percentage: z.number(),
      }),
      monitoringUrl: z.string().url().default('/admin/monitoring'),
    }),
    name: 'Health Check Failure Workflow (PT)',
    description: 'Alert administrators of system health issues',
    tags: ['system', 'alerts', 'monitoring', 'pt'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);
/**
 * ES - Welcome Workflow - Onboards new users to Eleva Care
 */
export const welcomeWorkflowES = workflow(
  'user-welcome-es',
  async ({ step, payload }) => {
    // In-app notification
    await step.inApp('welcome-message', async () => ({
      subject: '¡Bienvenido a Eleva Care, {userName}!',
      body: `¡Hola {userName}! Bienvenido a Eleva Care. Estamos emocionados de ayudarte en tu viaje de salud.`,
      avatar: 'https://eleva.care/logo.png',
      primaryAction: {
        label: 'Completa Tu Perfil',
        redirect: {
          url: payload.profileUrl,
          target: '_self',
        },
      },
    }));

    // Welcome email
    await step.email('welcome-email', async () => ({
      subject: '¡Bienvenido a Eleva Care!',
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>¡Bienvenido a Eleva Care!</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hola {firstName},{{payload.firstName}}</p>
          <p>Gracias por unirte a nuestra plataforma de salud. Estamos emocionados de ayudarte en tu viaje de bienestar.</p>
          <h3>Próximos Pasos:</h3>
          <ul>
            <li>Completa tu perfil</li><li>Navega por los especialistas disponibles</li><li>Reserva tu primera consulta</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.profileUrl}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Completa Tu Perfil
            </a>
          </div>
          <p>Best regards,<br>The Eleva Care Team</p>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      firstName: z.string(),
      profileUrl: z.string().url().default('/profile'),
    }),
    name: 'Welcome Workflow (ES)',
    description: 'Welcome new users to Eleva Care platform',
    tags: ['user-onboarding', 'welcome', 'es'],
    preferences: {
      all: { enabled: true, readOnly: false },
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * ES - Payment Success Workflow - Confirms successful payments
 */
export const paymentSuccessWorkflowES = workflow(
  'payment-success-es',
  async ({ step, payload }) => {
    // In-app confirmation
    await step.inApp('payment-confirmation', async () => ({
      subject: '¡Pago exitoso!',
      body: `Tu pago de {amount} para {planName} ha sido procesado exitosamente.`,
    }));

    // Email receipt
    await step.email('payment-receipt', async () => ({
      subject: `Payment Confirmation - ${payload.amount}`,
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
          <h1>Payment Confirmation</h1>
        </div>
        <div style="padding: 20px;">
          <p>Your payment has been successfully processed.</p>
          <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3>Payment Details:</h3>
            <p><strong>Amount:</strong> {{payload.amount}}</p>
            <p><strong>Plan:</strong> {{payload.planName}}</p>
            <p><strong>Date:</strong> {{payload.paymentDate}}</p>
            <p><strong>Transaction ID:</strong> {{payload.transactionId}}</p>
          </div>
          <p>Thank you for your payment!</p>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      planName: z.string(),
      paymentDate: z.string(),
      transactionId: z.string(),
    }),
    name: 'Payment Success Workflow (ES)',
    description: 'Confirm successful payments to users',
    tags: ['payments', 'confirmation', 'es'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * ES - Payment Failed Workflow - Alerts users of failed payments
 */
export const paymentFailedWorkflowES = workflow(
  'payment-failed-es',
  async ({ step, payload }) => {
    // In-app alert
    await step.inApp('payment-failure', async () => ({
      subject: 'Fallo en el pago',
      body: `No pudimos procesar tu pago de {amount}. Por favor, verifica tu método de pago e intenta nuevamente.`,
      primaryAction: {
        label: 'Update Payment Method',
        redirect: {
          url: payload.billingUrl,
          target: '_self',
        },
      },
    }));

    // Email alert
    await step.email('payment-failure-email', async () => ({
      subject: 'Payment Failed - Action Required',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1>Payment Failed</h1>
          </div>
          <div style="padding: 20px;">
            <p>We were unable to process your payment of ${payload.amount}.</p>
            <p><strong>Reason:</strong> ${payload.reason}</p>
            <p>Please update your payment method and try again.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${payload.billingUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method</a>
            </div>
          </div>
        </div>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      reason: z.string(),
      billingUrl: z.string().url().default('/billing'),
    }),
    name: 'Payment Failed Workflow (ES)',
    description: 'Alert users of failed payments',
    tags: ['payments', 'alerts', 'es'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * ES - Appointment Reminder Workflow - 24-hour appointment reminders
 */
export const appointmentReminderWorkflowES = workflow(
  'appointment-reminder-24hr-es',
  async ({ step, payload }) => {
    // In-app reminder
    await step.inApp('appointment-reminder-notification', async () => ({
      subject: 'Recordatorio: Tu cita es {timeUntilAppointment}',
      body: `Tu {appointmentType} con {expertName} es {timeUntilAppointment} el {appointmentDate} a las {appointmentTime}.`,
      primaryAction: {
        label: 'Accede a tu cita',
        redirect: {
          url: payload.meetingLink,
          target: '_blank',
        },
      },
    }));

    // Email reminder
    await step.email('appointment-reminder-email', async () => ({
      subject: `Recordatorio: Tu cita de Eleva Care es {timeUntilAppointment}`,
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>Recordatorio de Cita</h1>
        </div>
        <div style="padding: 20px;">
          <p>Hola {userName},{{payload.userName}}</p>
          <p>Este es un recordatorio amigable de que tu {appointmentType} con {expertName} es {timeUntilAppointment}, el {appointmentDate} a las {appointmentTime}.</p>
          <div style="background-color: #e8f5f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3>Appointment Details:</h3>
            <p><strong>Expert:</strong> {{payload.expertName}}</p>
            <p><strong>Date:</strong> {{payload.appointmentDate}}</p>
            <p><strong>Time:</strong> {{payload.appointmentTime}}</p>
            <p><strong>Type:</strong> {{payload.appointmentType}}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.meetingLink}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accede a tu cita
            </a>
          </div>
          <p><small>Por favor, asegúrate de estar en un lugar tranquilo con una conexión a internet estable.</small></p>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      expertName: z.string(),
      appointmentType: z.string(),
      timeUntilAppointment: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      meetingLink: z.string().url(),
    }),
    name: 'Appointment Reminder Workflow (ES)',
    description: '24-hour appointment reminders',
    tags: ['appointments', 'reminders', 'es'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * ES - Expert Onboarding Complete Workflow - Welcome experts when approved
 */
export const expertOnboardingCompleteWorkflowES = workflow(
  'expert-onboarding-complete-es',
  async ({ step, payload }) => {
    // In-app notification
    await step.inApp('onboarding-complete', async () => ({
      subject: '¡Configuración de experto completada!',
      body: `¡Felicidades {expertName}! Tu perfil de experto está ahora activo. Puedes comenzar a recibir reservas de clientes.`,
      primaryAction: {
        label: 'Ir al Panel',
        redirect: {
          url: payload.dashboardUrl,
          target: '_self',
        },
      },
    }));

    // Welcome email
    await step.email('expert-welcome-email', async () => ({
      subject: '¡Bienvenido a la Red de Expertos de Eleva Care!',
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>¡Felicidades, {expertName}!</h1>
        </div>
        <div style="padding: 20px;">
          <p>Tu perfil de experto está ahora activo en Eleva Care.</p>
          <p><strong>Especialización: {specialization}</strong></p>
          <h3>Ahora puedes:</h3>
          <ul>
            <li>Recibir reservas de clientes</li><li>Gestionar tu disponibilidad</li><li>Acompanhar tus ganancias</li><li>Construir tu base de clientes</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.dashboardUrl}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Ir al Panel
            </a>
          </div>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      expertName: z.string(),
      specialization: z.string(),
      dashboardUrl: z.string().url().default('/dashboard'),
    }),
    name: 'Expert Onboarding Complete Workflow (ES)',
    description: 'Welcome experts when their profile is approved',
    tags: ['experts', 'onboarding', 'es'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * ES - Health Check Failure Workflow - Alert administrators of system health issues
 */
export const healthCheckFailureWorkflowES = workflow(
  'health-check-failure-es',
  async ({ step, payload }) => {
    // In-app alert for admins
    await step.inApp('health-check-alert', async () => ({
      subject: '⚠️ Health Check Failure',
      body: `⚠️ Health Check Failure: ${payload.environment} - ${payload.status}. Error: ${payload.error}`,
    }));

    // Email alert for admins
    await step.email('health-check-alert-email', async () => ({
      subject: `⚠️ Eleva Care Health Check Failure - ${payload.environment}`,
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1>⚠️ Health Check Failure Alert</h1>
        </div>
        <div style="padding: 20px;">
          <p>A health check failure has been detected in the Eleva Care application.</p>
          <h3>System Details</h3>
          <ul>
            <li><strong>Status:</strong> {{payload.status}}</li>
            <li><strong>Error:</strong> {{payload.error}}</li>
            <li><strong>Environment:</strong> {{payload.environment}}</li>
            <li><strong>Timestamp:</strong> {{payload.timestamp}}</li>
            <li><strong>Version:</strong> {{payload.version}}</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.monitoringUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Monitoring Dashboard</a>
          </div>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      status: z.string(),
      error: z.string(),
      environment: z.string(),
      timestamp: z.string(),
      version: z.string(),
      memory: z.object({
        used: z.number(),
        total: z.number(),
        percentage: z.number(),
      }),
      monitoringUrl: z.string().url().default('/admin/monitoring'),
    }),
    name: 'Health Check Failure Workflow (ES)',
    description: 'Alert administrators of system health issues',
    tags: ['system', 'alerts', 'monitoring', 'es'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);
/**
 * BR - Welcome Workflow - Onboards new users to Eleva Care
 */
export const welcomeWorkflowBR = workflow(
  'user-welcome-br',
  async ({ step, payload }) => {
    // In-app notification
    await step.inApp('welcome-message', async () => ({
      subject: 'Bem-vindo à Eleva Care, {userName}!',
      body: `Olá {userName}! Bem-vindo à Eleva Care. Estamos empolgados em ajudá-lo na sua jornada de saúde.`,
      avatar: 'https://eleva.care/logo.png',
      primaryAction: {
        label: 'Complete Seu Perfil',
        redirect: {
          url: payload.profileUrl,
          target: '_self',
        },
      },
    }));

    // Welcome email
    await step.email('welcome-email', async () => ({
      subject: 'Bem-vindo à Eleva Care!',
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>Bem-vindo à Eleva Care!</h1>
        </div>
        <div style="padding: 20px;">
          <p>Olá {firstName},{{payload.firstName}}</p>
          <p>Obrigado por se juntar à nossa plataforma de saúde. Estamos empolgados em ajudá-lo na sua jornada de bem-estar.</p>
          <h3>Próximos Passos:</h3>
          <ul>
            <li>Complete seu perfil</li><li>Navegue pelos especialistas disponíveis</li><li>Agende sua primeira consulta</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.profileUrl}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Complete Seu Perfil
            </a>
          </div>
          <p>Best regards,<br>The Eleva Care Team</p>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      firstName: z.string(),
      profileUrl: z.string().url().default('/profile'),
    }),
    name: 'Welcome Workflow (BR)',
    description: 'Welcome new users to Eleva Care platform',
    tags: ['user-onboarding', 'welcome', 'br'],
    preferences: {
      all: { enabled: true, readOnly: false },
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * BR - Payment Success Workflow - Confirms successful payments
 */
export const paymentSuccessWorkflowBR = workflow(
  'payment-success-br',
  async ({ step, payload }) => {
    // In-app confirmation
    await step.inApp('payment-confirmation', async () => ({
      subject: 'Pagamento realizado com sucesso!',
      body: `Seu pagamento de {amount} para {planName} foi processado com sucesso.`,
    }));

    // Email receipt
    await step.email('payment-receipt', async () => ({
      subject: `Payment Confirmation - ${payload.amount}`,
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
          <h1>Payment Confirmation</h1>
        </div>
        <div style="padding: 20px;">
          <p>Your payment has been successfully processed.</p>
          <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3>Payment Details:</h3>
            <p><strong>Amount:</strong> {{payload.amount}}</p>
            <p><strong>Plan:</strong> {{payload.planName}}</p>
            <p><strong>Date:</strong> {{payload.paymentDate}}</p>
            <p><strong>Transaction ID:</strong> {{payload.transactionId}}</p>
          </div>
          <p>Thank you for your payment!</p>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      planName: z.string(),
      paymentDate: z.string(),
      transactionId: z.string(),
    }),
    name: 'Payment Success Workflow (BR)',
    description: 'Confirm successful payments to users',
    tags: ['payments', 'confirmation', 'br'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * BR - Payment Failed Workflow - Alerts users of failed payments
 */
export const paymentFailedWorkflowBR = workflow(
  'payment-failed-br',
  async ({ step, payload }) => {
    // In-app alert
    await step.inApp('payment-failure', async () => ({
      subject: 'Falha no pagamento',
      body: `Não conseguimos processar seu pagamento de {amount}. Por favor, verifique seu método de pagamento e tente novamente.`,
      primaryAction: {
        label: 'Update Payment Method',
        redirect: {
          url: payload.billingUrl,
          target: '_self',
        },
      },
    }));

    // Email alert
    await step.email('payment-failure-email', async () => ({
      subject: 'Payment Failed - Action Required',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1>Payment Failed</h1>
          </div>
          <div style="padding: 20px;">
            <p>We were unable to process your payment of ${payload.amount}.</p>
            <p><strong>Reason:</strong> ${payload.reason}</p>
            <p>Please update your payment method and try again.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${payload.billingUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method</a>
            </div>
          </div>
        </div>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      reason: z.string(),
      billingUrl: z.string().url().default('/billing'),
    }),
    name: 'Payment Failed Workflow (BR)',
    description: 'Alert users of failed payments',
    tags: ['payments', 'alerts', 'br'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * BR - Appointment Reminder Workflow - 24-hour appointment reminders
 */
export const appointmentReminderWorkflowBR = workflow(
  'appointment-reminder-24hr-br',
  async ({ step, payload }) => {
    // In-app reminder
    await step.inApp('appointment-reminder-notification', async () => ({
      subject: 'Lembrete: Sua consulta é {timeUntilAppointment}',
      body: `Sua {appointmentType} com {expertName} é {timeUntilAppointment} no dia {appointmentDate} às {appointmentTime}.`,
      primaryAction: {
        label: 'Acesse sua consulta',
        redirect: {
          url: payload.meetingLink,
          target: '_blank',
        },
      },
    }));

    // Email reminder
    await step.email('appointment-reminder-email', async () => ({
      subject: `Lembrete: Sua consulta da Eleva Care é {timeUntilAppointment}`,
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>Lembrete de Consulta</h1>
        </div>
        <div style="padding: 20px;">
          <p>Olá {userName},{{payload.userName}}</p>
          <p>Este é um lembrete amigável de que sua {appointmentType} com {expertName} é {timeUntilAppointment}, no dia {appointmentDate} às {appointmentTime}.</p>
          <div style="background-color: #e8f5f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3>Appointment Details:</h3>
            <p><strong>Expert:</strong> {{payload.expertName}}</p>
            <p><strong>Date:</strong> {{payload.appointmentDate}}</p>
            <p><strong>Time:</strong> {{payload.appointmentTime}}</p>
            <p><strong>Type:</strong> {{payload.appointmentType}}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.meetingLink}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Acesse sua consulta
            </a>
          </div>
          <p><small>Por favor, certifique-se de que você está em um local tranquilo com uma conexão de internet estável.</small></p>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      expertName: z.string(),
      appointmentType: z.string(),
      timeUntilAppointment: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      meetingLink: z.string().url(),
    }),
    name: 'Appointment Reminder Workflow (BR)',
    description: '24-hour appointment reminders',
    tags: ['appointments', 'reminders', 'br'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * BR - Expert Onboarding Complete Workflow - Welcome experts when approved
 */
export const expertOnboardingCompleteWorkflowBR = workflow(
  'expert-onboarding-complete-br',
  async ({ step, payload }) => {
    // In-app notification
    await step.inApp('onboarding-complete', async () => ({
      subject: 'Configuração de especialista concluída!',
      body: `Parabéns {expertName}! Seu perfil de especialista está agora ativo. Você pode começar a receber agendamentos de clientes.`,
      primaryAction: {
        label: 'Ir para o Painel',
        redirect: {
          url: payload.dashboardUrl,
          target: '_self',
        },
      },
    }));

    // Welcome email
    await step.email('expert-welcome-email', async () => ({
      subject: 'Bem-vindo à Rede de Especialistas da Eleva Care!',
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>Parabéns, {expertName}!</h1>
        </div>
        <div style="padding: 20px;">
          <p>Seu perfil de especialista está agora ativo na Eleva Care.</p>
          <p><strong>Especialização: {specialization}</strong></p>
          <h3>Agora você pode:</h3>
          <ul>
            <li>Receber agendamentos de clientes</li><li>Gerenciar sua disponibilidade</li><li>Acompanhar seus ganhos</li><li>Construir sua base de clientes</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.dashboardUrl}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Ir para o Painel
            </a>
          </div>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      expertName: z.string(),
      specialization: z.string(),
      dashboardUrl: z.string().url().default('/dashboard'),
    }),
    name: 'Expert Onboarding Complete Workflow (BR)',
    description: 'Welcome experts when their profile is approved',
    tags: ['experts', 'onboarding', 'br'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * BR - Health Check Failure Workflow - Alert administrators of system health issues
 */
export const healthCheckFailureWorkflowBR = workflow(
  'health-check-failure-br',
  async ({ step, payload }) => {
    // In-app alert for admins
    await step.inApp('health-check-alert', async () => ({
      subject: '⚠️ Health Check Failure',
      body: `⚠️ Health Check Failure: ${payload.environment} - ${payload.status}. Error: ${payload.error}`,
    }));

    // Email alert for admins
    await step.email('health-check-alert-email', async () => ({
      subject: `⚠️ Eleva Care Health Check Failure - ${payload.environment}`,
      body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1>⚠️ Health Check Failure Alert</h1>
        </div>
        <div style="padding: 20px;">
          <p>A health check failure has been detected in the Eleva Care application.</p>
          <h3>System Details</h3>
          <ul>
            <li><strong>Status:</strong> {{payload.status}}</li>
            <li><strong>Error:</strong> {{payload.error}}</li>
            <li><strong>Environment:</strong> {{payload.environment}}</li>
            <li><strong>Timestamp:</strong> {{payload.timestamp}}</li>
            <li><strong>Version:</strong> {{payload.version}}</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.monitoringUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Monitoring Dashboard</a>
          </div>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      status: z.string(),
      error: z.string(),
      environment: z.string(),
      timestamp: z.string(),
      version: z.string(),
      memory: z.object({
        used: z.number(),
        total: z.number(),
        percentage: z.number(),
      }),
      monitoringUrl: z.string().url().default('/admin/monitoring'),
    }),
    name: 'Health Check Failure Workflow (BR)',
    description: 'Alert administrators of system health issues',
    tags: ['system', 'alerts', 'monitoring', 'br'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

// Define supported locales as a const array
export const SUPPORTED_LOCALES = ['en', 'pt', 'es', 'br'] as const;

// Create a type from the array
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// Export all workflows grouped by locale
export const workflowsByLocale = {
  en: [
    welcomeWorkflowEN,
    paymentSuccessWorkflowEN,
    paymentFailedWorkflowEN,
    appointmentReminderWorkflowEN,
    expertOnboardingCompleteWorkflowEN,
    healthCheckFailureWorkflowEN,
  ],
  pt: [
    welcomeWorkflowPT,
    paymentSuccessWorkflowPT,
    paymentFailedWorkflowPT,
    appointmentReminderWorkflowPT,
    expertOnboardingCompleteWorkflowPT,
    healthCheckFailureWorkflowPT,
  ],
  es: [
    welcomeWorkflowES,
    paymentSuccessWorkflowES,
    paymentFailedWorkflowES,
    appointmentReminderWorkflowES,
    expertOnboardingCompleteWorkflowES,
    healthCheckFailureWorkflowES,
  ],
  br: [
    welcomeWorkflowBR,
    paymentSuccessWorkflowBR,
    paymentFailedWorkflowBR,
    appointmentReminderWorkflowBR,
    expertOnboardingCompleteWorkflowBR,
    healthCheckFailureWorkflowBR,
  ],
} as const;

// Export all workflows in a single array for easy import
export const workflows = [
  ...workflowsByLocale.en,
  ...workflowsByLocale.pt,
  ...workflowsByLocale.es,
  ...workflowsByLocale.br,
];

// Helper function to get workflows for a specific locale
export function getWorkflowsForLocale(
  locale: SupportedLocale | string,
): (typeof workflowsByLocale)[SupportedLocale] {
  if (isSupportedLocale(locale)) {
    return workflowsByLocale[locale];
  }
  return workflowsByLocale.en;
}

// Helper function to get workflow ID with locale suffix
export function getLocalizedWorkflowId(
  baseId: string,
  locale: SupportedLocale | string = 'en',
): string {
  if (isSupportedLocale(locale)) {
    return `${baseId}-${locale}`;
  }
  return `${baseId}-en`;
}

// Type guard to check if a locale is supported
function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}
