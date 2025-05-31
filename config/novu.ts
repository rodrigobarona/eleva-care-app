import { workflow } from '@novu/framework';
import { z } from 'zod';

// Define notification workflows
export const welcomeWorkflow = workflow(
  'user-welcome',
  async ({ payload, step }) => {
    await step.inApp('welcome-message', async () => ({
      subject: `Welcome to Eleva Care, ${payload.userName}!`,
      body: `Hi ${payload.userName}! Welcome to Eleva Care. We're excited to help you on your healthcare journey.`,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
    }),
  },
);

export const accountVerificationWorkflow = workflow(
  'account-verification',
  async ({ payload: _payload, step }) => {
    await step.inApp('verification-reminder', async () => ({
      subject: 'Please verify your account',
      body: 'To get the most out of Eleva Care, please verify your account.',
    }));
  },
  {
    payloadSchema: z.object({
      userId: z.string(),
      verificationUrl: z.string().optional(),
    }),
  },
);

export const paymentSuccessWorkflow = workflow(
  'payment-success',
  async ({ payload, step }) => {
    await step.inApp('payment-confirmation', async () => ({
      subject: 'Payment successful!',
      body: `Your payment of ${payload.amount} for ${payload.planName} has been processed successfully.`,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      planName: z.string(),
    }),
  },
);

export const paymentFailedWorkflow = workflow(
  'payment-failed',
  async ({ payload, step }) => {
    await step.inApp('payment-failure', async () => ({
      subject: 'Payment failed',
      body: `We couldn't process your payment of ${payload.amount}. Please check your payment method and try again.`,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      reason: z.string().optional(),
    }),
  },
);

export const securityAlertWorkflow = workflow(
  'security-alert',
  async ({ payload, step }) => {
    await step.inApp('security-notification', async () => ({
      subject: 'Security Alert',
      body: payload.message,
    }));
  },
  {
    payloadSchema: z.object({
      message: z.string(),
      alertType: z.string().optional(),
    }),
  },
);

// New Stripe-specific workflows
export const stripeAccountUpdateWorkflow = workflow(
  'stripe-account-update',
  async ({ payload, step }) => {
    await step.inApp('account-status-change', async () => ({
      subject: 'Account Status Updated',
      body: payload.message,
    }));
  },
  {
    payloadSchema: z.object({
      message: z.string(),
      accountId: z.string(),
      statusType: z.string().optional(),
    }),
  },
);

export const stripePayoutWorkflow = workflow(
  'stripe-payout',
  async ({ payload, step }) => {
    await step.inApp('payout-notification', async () => ({
      subject: `Payout ${payload.status}: ${payload.amount}`,
      body: payload.message,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      status: z.string(),
      message: z.string(),
      payoutId: z.string(),
    }),
  },
);

// Enhanced Marketplace Payment Workflows
export const marketplacePaymentReceivedWorkflow = workflow(
  'marketplace-payment-received',
  async ({ payload, step }) => {
    await step.inApp('payment-received-notification', async () => ({
      subject: `Payment Received: €${payload.amount}`,
      body: `You've received a payment of €${payload.amount} from ${payload.clientName || 'a client'} for your session on ${payload.sessionDate}. Transfer will be processed according to your payout schedule.`,
    }));

    await step.email('payment-received-email', async () => ({
      subject: `Payment Received - €${payload.amount}`,
      body: `
        {% assign lang_code = subscriber.locale | slice: 0, 2 %}
        {% if lang_code == 'pt' and subscriber.locale == 'pt-BR' %}
        <h2>Pagamento Recebido!</h2>
        <p>Ótimas notícias! Você recebeu um pagamento pelos seus serviços.</p>
        <h3>Detalhes do Pagamento:</h3>
        <ul>
          <li><strong>Valor:</strong> €${payload.amount}</li>
          <li><strong>Cliente:</strong> ${payload.clientName || 'Cliente'}</li>
          <li><strong>Data da Sessão:</strong> ${payload.sessionDate}</li>
          <li><strong>ID da Transação:</strong> ${payload.transactionId}</li>
        </ul>
        <p>Este pagamento será transferido para sua conta de acordo com seu cronograma de pagamento.</p>
        <p><a href="${payload.dashboardUrl || '/account/billing'}">Ver Detalhes do Pagamento</a></p>
        {% elsif lang_code == 'pt' %}
        <h2>Pagamento Recebido!</h2>
        <p>Excelentes notícias! Recebeu um pagamento pelos seus serviços.</p>
        <h3>Detalhes do Pagamento:</h3>
        <ul>
          <li><strong>Valor:</strong> €${payload.amount}</li>
          <li><strong>Cliente:</strong> ${payload.clientName || 'Cliente'}</li>
          <li><strong>Data da Sessão:</strong> ${payload.sessionDate}</li>
          <li><strong>ID da Transação:</strong> ${payload.transactionId}</li>
        </ul>
        <p>Este pagamento será transferido para a sua conta de acordo com o seu cronograma de pagamento.</p>
        <p><a href="${payload.dashboardUrl || '/account/billing'}">Ver Detalhes do Pagamento</a></p>
        {% elsif lang_code == 'es' %}
        <h2>¡Pago Recibido!</h2>
        <p>¡Excelentes noticias! Has recibido un pago por tus servicios.</p>
        <h3>Detalles del Pago:</h3>
        <ul>
          <li><strong>Importe:</strong> €${payload.amount}</li>
          <li><strong>Cliente:</strong> ${payload.clientName || 'Cliente'}</li>
          <li><strong>Fecha de la Sesión:</strong> ${payload.sessionDate}</li>
          <li><strong>ID de Transacción:</strong> ${payload.transactionId}</li>
        </ul>
        <p>Este pago será transferido a tu cuenta según tu cronograma de pagos.</p>
        <p><a href="${payload.dashboardUrl || '/account/billing'}">Ver Detalles del Pago</a></p>
        {% else %}
        <h2>Payment Received!</h2>
        <p>Great news! You've received a payment for your services.</p>
        <h3>Payment Details:</h3>
        <ul>
          <li><strong>Amount:</strong> €${payload.amount}</li>
          <li><strong>Client:</strong> ${payload.clientName || 'Client'}</li>
          <li><strong>Session Date:</strong> ${payload.sessionDate}</li>
          <li><strong>Transaction ID:</strong> ${payload.transactionId}</li>
        </ul>
        <p>This payment will be transferred to your account according to your payout schedule.</p>
        <p><a href="${payload.dashboardUrl || '/account/billing'}">View Payment Details</a></p>
        {% endif %}
      `,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      clientName: z.string().optional(),
      sessionDate: z.string(),
      transactionId: z.string(),
      dashboardUrl: z.string().optional(),
    }),
  },
);

export const marketplacePayoutProcessedWorkflow = workflow(
  'marketplace-payout-processed',
  async ({ payload, step }) => {
    await step.inApp('payout-processed-notification', async () => ({
      subject: `Payout Processed: €${payload.amount}`,
      body: `Your payout of €${payload.amount} has been processed and sent to your bank account. Expected arrival: ${payload.expectedArrival}.`,
    }));

    await step.email('payout-processed-email', async () => ({
      subject: `Payout Processed - €${payload.amount}`,
      body: `
        <h2>Payout Processed</h2>
        <p>Your earnings have been transferred to your bank account.</p>
        <h3>Payout Details:</h3>
        <ul>
          <li><strong>Amount:</strong> €${payload.amount}</li>
          <li><strong>Payout ID:</strong> ${payload.payoutId}</li>
          <li><strong>Expected Arrival:</strong> ${payload.expectedArrival}</li>
          <li><strong>Bank Account:</strong> ${payload.bankAccount}</li>
        </ul>
        <p><a href="${payload.dashboardUrl || '/account/billing'}">View Payout History</a></p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      payoutId: z.string(),
      expectedArrival: z.string(),
      bankAccount: z.string(),
      dashboardUrl: z.string().optional(),
    }),
  },
);

export const marketplaceConnectAccountStatusWorkflow = workflow(
  'marketplace-connect-status',
  async ({ payload, step }) => {
    await step.inApp('connect-status-notification', async () => ({
      subject: payload.title,
      body: payload.message,
    }));

    if (payload.requiresAction) {
      await step.email('connect-status-email', async () => ({
        subject: payload.title,
        body: `
          <h2>${payload.title}</h2>
          <p>${payload.message}</p>
          ${payload.actionRequired ? `<p><strong>Action Required:</strong> ${payload.actionRequired}</p>` : ''}
          <p><a href="${payload.actionUrl || '/account/connect'}">Complete Setup</a></p>
        `,
      }));
    }
  },
  {
    payloadSchema: z.object({
      title: z.string(),
      message: z.string(),
      requiresAction: z.boolean().default(false),
      actionRequired: z.string().optional(),
      actionUrl: z.string().optional(),
    }),
  },
);

// Clerk-specific workflows
export const userCreatedWorkflow = workflow(
  'user-created',
  async ({ payload, step }) => {
    await step.inApp('welcome-new-user', async () => ({
      subject: `Welcome to Eleva Care, ${payload.firstName || 'there'}!`,
      body: `Thank you for joining Eleva Care. Complete your profile to get started with personalized healthcare recommendations.`,
    }));

    await step.email('welcome-email', async () => ({
      subject: 'Welcome to Eleva Care!',
      body: `
        <h2>Welcome to Eleva Care!</h2>
        <p>Hi ${payload.firstName || 'there'},</p>
        <p>Thank you for joining our healthcare platform. We're excited to help you on your wellness journey.</p>
        <h3>Next Steps:</h3>
        <ul>
          <li>Complete your profile</li>
          <li>Browse available experts</li>
          <li>Book your first consultation</li>
        </ul>
        <p><a href="/profile">Complete Your Profile</a></p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email(),
      clerkUserId: z.string(),
    }),
  },
);

export const recentLoginWorkflow = workflow(
  'recent-login-v2',
  async ({ payload, step }) => {
    await step.inApp('login-notification', async () => ({
      subject: 'New login detected',
      body: `We detected a new login to your account from ${payload.location || 'a new device'} at ${payload.timestamp}.`,
    }));
  },
  {
    payloadSchema: z.object({
      location: z.string().optional(),
      timestamp: z.string(),
      ipAddress: z.string().optional(),
    }),
  },
);

// Expert-specific workflows
export const expertOnboardingCompleteWorkflow = workflow(
  'expert-onboarding-complete',
  async ({ payload, step }) => {
    await step.inApp('onboarding-complete', async () => ({
      subject: 'Expert setup complete!',
      body: `Congratulations ${payload.expertName}! Your expert profile is now live. You can start receiving bookings from clients.`,
    }));

    await step.email('expert-welcome-email', async () => ({
      subject: 'Welcome to the Eleva Care Expert Network!',
      body: `
        <h2>Congratulations, ${payload.expertName}!</h2>
        <p>Your expert profile is now active on Eleva Care.</p>
        ${payload.specialization ? `<p><strong>Specialization:</strong> ${payload.specialization}</p>` : ''}
        <h3>You can now:</h3>
        <ul>
          <li>Receive client bookings</li>
          <li>Manage your availability</li>
          <li>Track your earnings</li>
          <li>Build your client base</li>
        </ul>
        <p><a href="/dashboard">Go to Dashboard</a></p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      expertName: z.string(),
      specialization: z.string().optional(),
    }),
  },
);

// Appointment Management Workflows
export const appointmentReminderWorkflow = workflow(
  'appointment-reminder-24hr',
  async ({ payload, step }) => {
    await step.inApp('appointment-reminder-notification', async () => ({
      subject: `Reminder: Your appointment is ${payload.timeUntilAppointment}`,
      body: `Your ${payload.appointmentType} with ${payload.expertName} is ${payload.timeUntilAppointment} on ${payload.appointmentDate} at ${payload.appointmentTime}.`,
    }));

    await step.email('appointment-reminder-email', async () => ({
      subject: `Reminder: Your Eleva Care Appointment is ${payload.timeUntilAppointment}`,
      body: `
        {% assign lang_code = subscriber.locale | slice: 0, 2 %}
        {% if lang_code == 'pt' and subscriber.locale == 'pt-BR' %}
        <h2>Lembrete de Consulta</h2>
        <p>Olá ${payload.userName},</p>
        <p>Este é um lembrete amigável de que sua ${payload.appointmentType} com ${payload.expertName} é ${payload.timeUntilAppointment}, no dia ${payload.appointmentDate} às ${payload.appointmentTime}.</p>
        <p><a href="${payload.meetingLink}">Acesse sua consulta</a></p>
        <p>Por favor, certifique-se de que você está em um local tranquilo com uma conexão de internet estável.</p>
        {% elsif lang_code == 'pt' %}
        <h2>Lembrete de Consulta</h2>
        <p>Olá ${payload.userName},</p>
        <p>Este é um lembrete amigável de que a sua ${payload.appointmentType} com ${payload.expertName} é ${payload.timeUntilAppointment}, no dia ${payload.appointmentDate} às ${payload.appointmentTime}.</p>
        <p><a href="${payload.meetingLink}">Aceda à sua consulta</a></p>
        <p>Por favor, certifique-se de que está num local sossegado com uma ligação estável à internet.</p>
        {% elsif lang_code == 'es' %}
        <h2>Recordatorio de Cita</h2>
        <p>Hola ${payload.userName},</p>
        <p>Este es un recordatorio de que tu ${payload.appointmentType} con ${payload.expertName} es ${payload.timeUntilAppointment}, el ${payload.appointmentDate} a las ${payload.appointmentTime}.</p>
        <p><a href="${payload.meetingLink}">Accede a tu cita</a></p>
        <p>Por favor, asegúrate de estar en un lugar tranquilo con una conexión a internet estable.</p>
        {% else %}
        <h2>Appointment Reminder</h2>
        <p>Hi ${payload.userName},</p>
        <p>This is a friendly reminder that your ${payload.appointmentType} with ${payload.expertName} is ${payload.timeUntilAppointment}, on ${payload.appointmentDate} at ${payload.appointmentTime}.</p>
        <p><a href="${payload.meetingLink}">Join your meeting</a></p>
        <p>Please ensure you are in a quiet place with a stable internet connection.</p>
        {% endif %}
      `,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      expertName: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      appointmentType: z.string(),
      timeUntilAppointment: z.string(),
      meetingLink: z.string(),
    }),
  },
);

export const appointmentCancelledWorkflow = workflow(
  'appointment-cancelled',
  async ({ payload, step }) => {
    await step.inApp('appointment-cancelled-notification', async () => ({
      subject: `Appointment Cancelled: ${payload.appointmentType}`,
      body: `Your appointment with ${payload.expertName} on ${payload.appointmentDate} has been cancelled.`,
    }));

    await step.email('appointment-cancelled-email', async () => ({
      subject: `Your Eleva Care Appointment Has Been Cancelled`,
      body: `
        <h2>Appointment Cancelled</h2>
        <p>Hi ${payload.userName},</p>
        <p>Your ${payload.appointmentType} with ${payload.expertName} scheduled for ${payload.appointmentDate} at ${payload.appointmentTime} has been cancelled.</p>
        ${payload.reasonForCancellation ? `<p><strong>Reason:</strong> ${payload.reasonForCancellation}</p>` : ''}
        ${payload.refundStatusMessage ? `<p>${payload.refundStatusMessage}</p>` : ''}
        <p>We apologize for any inconvenience. You can book a new appointment anytime.</p>
        <p><a href="${payload.rebookingLink || '/booking'}">Book New Appointment</a></p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      expertName: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      appointmentType: z.string(),
      reasonForCancellation: z.string().optional(),
      refundStatusMessage: z.string().optional(),
      rebookingLink: z.string().optional(),
    }),
  },
);

// Expert Business Workflows
export const expertPayoutSetupReminderWorkflow = workflow(
  'expert-payout-setup-reminder',
  async ({ payload, step }) => {
    await step.inApp('payout-setup-reminder', async () => ({
      subject: 'Complete your payout setup',
      body: `Hi ${payload.expertName}, please complete your Stripe Connect setup to start receiving payments from clients.`,
    }));

    await step.email('payout-setup-reminder-email', async () => ({
      subject: 'Complete Your Eleva Care Payout Account Setup',
      body: `
        <h2>Complete Your Payout Setup</h2>
        <p>Hi ${payload.expertName},</p>
        <p>To start receiving payments from your clients, you need to complete your payout account setup.</p>
        <p><strong>This is required to receive payments for your sessions.</strong></p>
        <p><a href="${payload.stripeConnectSetupLink}">Complete Payout Setup</a></p>
        ${payload.deadlineText ? `<p><em>${payload.deadlineText}</em></p>` : ''}
        <p>Need help? <a href="${payload.supportContactLink || '/support'}">Contact Support</a></p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      expertName: z.string(),
      stripeConnectSetupLink: z.string(),
      deadlineText: z.string().optional(),
      supportContactLink: z.string().optional(),
    }),
  },
);

export const expertProfileActionRequiredWorkflow = workflow(
  'expert-profile-action-required',
  async ({ payload, step }) => {
    await step.inApp('profile-action-notification', async () => ({
      subject: payload.statusMessage,
      body: payload.message,
    }));

    await step.email('profile-action-email', async () => ({
      subject: 'Update Regarding Your Eleva Care Expert Profile',
      body: `
        <h2>Profile Update Required</h2>
        <p>Hi ${payload.expertName},</p>
        <p><strong>Status:</strong> ${payload.statusMessage}</p>
        ${payload.specificFeedback ? `<p><strong>Details:</strong> ${payload.specificFeedback}</p>` : ''}
        <p>Please review and update your profile to continue receiving bookings.</p>
        <p><a href="${payload.profileEditLink}">Update Your Profile</a></p>
        <p>Questions? <a href="${payload.supportContactLink || '/support'}">Contact Support</a></p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      expertName: z.string(),
      statusMessage: z.string(),
      message: z.string(),
      specificFeedback: z.string().optional(),
      profileEditLink: z.string(),
      supportContactLink: z.string().optional(),
    }),
  },
);

export const newBookingExpertWorkflow = workflow(
  'new-booking-expert',
  async ({ payload, step }) => {
    await step.inApp('new-booking-notification', async () => ({
      subject: `New Booking: ${payload.appointmentType}`,
      body: `You have a new booking from ${payload.clientName} for ${payload.appointmentDate} at ${payload.appointmentTime}.`,
    }));

    await step.email('new-booking-email', async () => ({
      subject: `New Booking: ${payload.appointmentType} with ${payload.clientName}`,
      body: `
        <h2>New Booking Alert!</h2>
        <p>Hi ${payload.expertName},</p>
        <p>You have a new booking!</p>
        <h3>Booking Details:</h3>
        <ul>
          <li><strong>Service:</strong> ${payload.appointmentType}</li>
          <li><strong>Client:</strong> ${payload.clientName}</li>
          <li><strong>Date:</strong> ${payload.appointmentDate}</li>
          <li><strong>Time:</strong> ${payload.appointmentTime}</li>
        </ul>
        ${payload.clientNotes ? `<p><strong>Client Notes:</strong> ${payload.clientNotes}</p>` : ''}
        <p><a href="${payload.appointmentDetailsLink}">View Booking Details</a></p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      expertName: z.string(),
      clientName: z.string(),
      appointmentType: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      clientNotes: z.string().optional(),
      appointmentDetailsLink: z.string(),
    }),
  },
);

// Export all workflows
export const workflows = [
  welcomeWorkflow,
  accountVerificationWorkflow,
  paymentSuccessWorkflow,
  paymentFailedWorkflow,
  securityAlertWorkflow,
  stripeAccountUpdateWorkflow,
  stripePayoutWorkflow,
  // Marketplace workflows
  marketplacePaymentReceivedWorkflow,
  marketplacePayoutProcessedWorkflow,
  marketplaceConnectAccountStatusWorkflow,
  // Clerk workflows
  userCreatedWorkflow,
  recentLoginWorkflow,
  expertOnboardingCompleteWorkflow,
  appointmentReminderWorkflow,
  appointmentCancelledWorkflow,
  // Expert Business Workflows
  expertPayoutSetupReminderWorkflow,
  expertProfileActionRequiredWorkflow,
  newBookingExpertWorkflow,
];
