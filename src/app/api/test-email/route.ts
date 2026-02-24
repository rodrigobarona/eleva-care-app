import {
  generateAppointmentEmail,
  generateExpertNotificationEmail,
  generateMultibancoBookingPendingEmail,
  generateMultibancoPaymentReminderEmail,
  generateNotificationEmail,
  generateWelcomeEmail,
  sendEmail,
} from '@/lib/integrations/novu/email';
import { hasRole } from '@/lib/auth/roles.server';
import { WORKOS_ROLES } from '@/types/workos-rbac';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/test-email - Send a test email using centralized React Email templates
 * Restricted to superadmin users only.
 *
 * Query Parameters:
 * - to: Email address (default: 'delivered@resend.dev')
 * - locale: Language (en|es|pt|br, default: 'en')
 * - type: Email type (welcome|expert|appointment|payment|multibanco-pending|multibanco-reminder|notification, default: 'welcome')
 */
export async function GET(request: NextRequest) {
  const { user } = await withAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const isAdmin = await hasRole(WORKOS_ROLES.SUPERADMIN);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const supportedLocales = ['en', 'es', 'pt', 'pt-BR'] as const;
    const locale = searchParams.get('locale') || 'en';
    if (!supportedLocales.includes(locale as (typeof supportedLocales)[number])) {
      return NextResponse.json(
        { success: false, error: `Unsupported locale: ${locale}` },
        { status: 400 },
      );
    }

    // Validate email format if provided
    const to = searchParams.get('to') || 'delivered@resend.dev';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (to !== 'delivered@resend.dev' && !emailRegex.test(to)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
    }

    const emailType = searchParams.get('type') || 'welcome';

    // Generate email based on type using centralized functions
    let emailContent: { html: string; text: string; subject: string };

    switch (emailType) {
      case 'welcome':
        emailContent = await generateWelcomeEmail({
          userName: 'Dr. João Silva',
          dashboardUrl: '/dashboard',
          nextSteps: [
            {
              title: 'Complete your health profile',
              description:
                'Help us personalize your care experience with detailed health information',
              actionUrl: '/profile/complete',
              actionText: 'Complete Profile',
            },
            {
              title: 'Browse expert providers',
              description:
                'Find healthcare professionals that match your specific needs and preferences',
              actionUrl: '/providers',
              actionText: 'View Providers',
            },
          ],
          locale,
        });
        break;

      case 'appointment':
        emailContent = await generateAppointmentEmail({
          expertName: 'Dr. Maria Santos',
          clientName: 'João Silva',
          appointmentDate: 'Monday, February 19, 2024',
          appointmentTime: '2:30 PM - 3:30 PM',
          timezone: 'Europe/Lisbon',
          appointmentDuration: '60 minutes',
          eventTitle: 'Consulta de Cardiologia',
          meetLink: 'https://meet.google.com/abc-defg-hij',
          notes: 'First consultation - health check',
          locale,
        });
        break;

      case 'expert':
        emailContent = await generateExpertNotificationEmail({
          expertName: 'Dr. Maria Santos',
          notificationTitle: 'New Appointment Request',
          notificationMessage:
            'You have received a new appointment request from João Silva for a cardiology consultation.',
          actionUrl: '/dashboard/appointments',
          actionText: 'View Appointments',
          locale,
        });
        break;

      case 'notification':
        emailContent = await generateNotificationEmail({
          title: 'Important Update',
          message:
            'Your account has been successfully verified. You can now access all features of the Eleva Care platform.',
          userName: 'Dr. João Silva',
          actionUrl: '/dashboard',
          actionText: 'Go to Dashboard',
          locale,
        });
        break;

      case 'multibanco-pending':
        emailContent = await generateMultibancoBookingPendingEmail({
          customerName: 'João Silva',
          expertName: 'Dr. Maria Santos',
          serviceName: 'Consulta de Cardiologia',
          appointmentDate: '2024-02-19',
          appointmentTime: '14:30',
          timezone: 'Europe/Lisbon',
          duration: 60,
          multibancoEntity: '12345',
          multibancoReference: '987654321',
          multibancoAmount: '75.00',
          voucherExpiresAt: '2024-02-22',
          hostedVoucherUrl: 'https://eleva.care/payment/voucher/123',
          customerNotes: 'First consultation - health check',
          locale,
        });
        break;

      case 'multibanco-reminder':
        emailContent = await generateMultibancoPaymentReminderEmail({
          customerName: 'João Silva',
          expertName: 'Dr. Maria Santos',
          serviceName: 'Consulta de Cardiologia',
          appointmentDate: '2024-02-19',
          appointmentTime: '14:30',
          timezone: 'Europe/Lisbon',
          duration: 60,
          multibancoEntity: '12345',
          multibancoReference: '987654321',
          multibancoAmount: '75.00',
          voucherExpiresAt: '2024-02-20',
          hostedVoucherUrl: 'https://eleva.care/payment/voucher/123',
          customerNotes: 'Payment reminder - expires soon',
          reminderType: 'urgent',
          daysRemaining: 1,
          locale,
        });
        break;

      case 'payment':
        // For now, use notification email for payment confirmations
        emailContent = await generateNotificationEmail({
          title: 'Payment Confirmation',
          message:
            'Your payment of €75.00 for the cardiology consultation has been successfully processed. Your appointment is confirmed.',
          userName: 'João Silva',
          actionUrl: '/dashboard/appointments',
          actionText: 'View Appointment',
          locale,
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported email type: ${emailType}` },
          { status: 400 },
        );
    }

    // Send via the centralized sendEmail function
    const response = await sendEmail({
      to,
      subject: `[TEST] ${emailContent.subject}`,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (!response.success) {
      return NextResponse.json({ success: false, error: response.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: response.messageId,
      emailType,
      locale,
      to,
      subject: emailContent.subject,
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send test email' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/test-email - Send a custom test email
 * Restricted to superadmin users only.
 *
 * Body Parameters:
 * - to: Email address
 * - subject: Email subject
 * - content: HTML content
 * - locale: Language code
 */
export async function POST(request: NextRequest) {
  const { user } = await withAuth();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const isAdmin = await hasRole(WORKOS_ROLES.SUPERADMIN);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { to, subject, content, locale = 'en' } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject' },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
    }

    // Use notification email for custom content
    const emailContent = await generateNotificationEmail({
      title: subject,
      message: content || 'Custom test email',
      locale,
    });

    const response = await sendEmail({
      to,
      subject: `[TEST] ${subject}`,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (!response.success) {
      return NextResponse.json({ success: false, error: response.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: response.messageId,
      to,
      subject,
      locale,
    });
  } catch (error) {
    console.error('Custom test email error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send custom test email' },
      { status: 500 },
    );
  }
}
