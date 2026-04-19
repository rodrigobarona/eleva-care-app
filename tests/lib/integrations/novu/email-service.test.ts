/**
 * Regression tests for the placeholder-leak bug
 * (plan: fix_fake_email_content_bug).
 *
 * The original bug: `ElevaEmailService` render methods went through a
 * `renderEmailWithSelection` path that spread workflow payloads onto React
 * Email templates without renaming props. Templates had realistic-looking
 * default values ("João Silva", "Dr. Maria Santos", "Consulta de Cardiologia",
 * "2024-02-15") so any unmapped prop silently leaked into production emails.
 *
 * These tests assert two invariants for every render method and every
 * workflow trigger payload that exists in the codebase:
 *   1. Real customer/expert/service values from the payload appear in the HTML.
 *   2. None of the known placeholder strings appear in the HTML.
 *
 * If either invariant breaks, this suite fails.
 */
import {
  ElevaEmailService,
  getPropAdapter,
  templateSelectionService,
} from '@/lib/integrations/novu/email-service';
import { beforeAll, describe, expect, test } from '@jest/globals';

// Mock the Novu client so the module loads without real credentials.
jest.mock('@novu/api', () => ({
  Novu: jest.fn().mockImplementation(() => ({
    trigger: jest.fn().mockResolvedValue({ ok: true }),
  })),
}));

// React Email's `render` uses dynamic imports that don't run cleanly under
// Jest's default config (would require --experimental-vm-modules). For these
// regression tests we only care about the rendered HTML string, so swap in
// renderToStaticMarkup from react-dom/server which produces equivalent output
// for our assertion purposes.
jest.mock('@react-email/render', () => ({
  // Note: real render returns a Promise; some call sites await, others don't.
  // We return a resolved promise to work with both.
  render: (element: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ReactDOMServer = require('react-dom/server');
    return Promise.resolve(ReactDOMServer.renderToStaticMarkup(element));
  },
}));

// Strings that must NEVER appear in production-rendered emails. These were the
// realistic-looking default values that caused the bug — they're now isolated
// to PreviewProps blocks and should not surface in `render()` output.
const PLACEHOLDER_LEAK_STRINGS = [
  'João Silva',
  'Dr. Maria Santos',
  'Maria Santos',
  'Consulta de Cardiologia',
  'Marta Carvalho',
  'Patricia Mota',
  'cardiology consultation',
  'Mental Health Consultation',
  'Physical Therapy Appointment', // realistic default in expert-new-appointment
  'First consultation - health check',
  'Monday, February 19, 2024',
  'Wednesday, January 21, 2026',
  '2024-02-15',
  '2024-02-19',
  '2024-02-20',
  '2:30 PM - 3:30 PM',
  'February 21, 2024',
  'po_1ABCDEF2ghijklmn',
  'pi_example123',
  'txn_1234567890',
  '••••4242',
];

function assertNoPlaceholderLeaks(html: string, allow: string[] = []): void {
  for (const placeholder of PLACEHOLDER_LEAK_STRINGS) {
    if (allow.includes(placeholder)) continue;
    expect(html).not.toContain(placeholder);
  }
}

describe('ElevaEmailService — placeholder-leak regression', () => {
  let service: ElevaEmailService;

  beforeAll(() => {
    service = new ElevaEmailService();
  });

  describe('renderAppointmentConfirmation', () => {
    test('renders real customer + service values; never leaks placeholders', async () => {
      const html = await service.renderAppointmentConfirmation({
        expertName: 'Patricia Mota Coelho',
        clientName: 'Matilde Henriques',
        appointmentDate: 'Tuesday, April 22, 2026',
        appointmentTime: '2:00 PM',
        timezone: 'Europe/Lisbon',
        appointmentDuration: '45 minutes',
        eventTitle: 'Physiotherapy session',
        meetLink: 'https://meet.google.com/real-call-id',
        notes: 'Pelvic floor consultation',
        locale: 'en',
      });

      expect(html).toContain('Matilde Henriques');
      expect(html).toContain('Patricia Mota Coelho');
      expect(html).toContain('Physiotherapy session');
      expect(html).toContain('Tuesday, April 22, 2026');
      // 'Patricia Mota' is a substring of 'Patricia Mota Coelho' which is a real value here.
      assertNoPlaceholderLeaks(html, ['Patricia Mota']);
    });

    test('does not leak placeholders when optional props are missing', async () => {
      const html = await service.renderAppointmentConfirmation({
        expertName: 'Real Expert',
        clientName: 'Real Customer',
        appointmentDate: 'Some Date',
        appointmentTime: '10:00 AM',
        timezone: 'UTC',
        appointmentDuration: '30 minutes',
        eventTitle: 'Real Service',
        // meetLink and notes intentionally omitted — must not fall through to
        // the old "https://eleva.care/meet/apt_conf_123" / "First consultation
        // - health check" defaults.
      });

      assertNoPlaceholderLeaks(html);
      expect(html).not.toContain('apt_conf_123');
    });
  });

  describe('renderAppointmentReminder', () => {
    test('renders patient reminder with real values (the Matilde regression)', async () => {
      // This payload mirrors what app/api/cron/appointment-reminders/route.ts
      // sends for the patient branch.
      const html = await service.renderAppointmentReminder({
        userName: 'Matilde Henriques',
        expertName: 'Madalena Pinto Coelho',
        appointmentType: 'Physiotherapy session',
        appointmentDate: 'Monday, April 20, 2026',
        appointmentTime: '12:00 PM',
        timezone: 'Europe/Lisbon',
        duration: 60,
        meetingUrl: 'https://meet.google.com/real-call-id',
        locale: 'en',
      });

      expect(html).toContain('Matilde Henriques');
      expect(html).toContain('Madalena Pinto Coelho');
      expect(html).toContain('Physiotherapy session');
      assertNoPlaceholderLeaks(html);
    });

    test('does not render the WRONG template ("Appointment Confirmed!")', async () => {
      // Reminder emails were previously rendered with AppointmentConfirmation-
      // Template, which produced "✅ Appointment Confirmed!" as the heading.
      const html = await service.renderAppointmentReminder({
        userName: 'Test Patient',
        expertName: 'Test Expert',
        appointmentType: 'Test Service',
        appointmentDate: 'Today',
        appointmentTime: 'Now',
      });

      // The reminder template's title is "Appointment Reminder" (or PT/ES variant).
      expect(html).not.toContain('✅ Appointment Confirmed');
      // It SHOULD contain reminder-specific copy.
      expect(html.toLowerCase()).toMatch(/reminder|lembrete/i);
    });
  });

  describe('renderPaymentConfirmation', () => {
    test('flattens appointmentDetails and renders real values', async () => {
      // This payload mirrors what app/api/webhooks/stripe/handlers/payment.ts
      // sends from `payment_intent.succeeded`.
      const html = await service.renderPaymentConfirmation({
        customerName: 'Matilde Henriques',
        amount: '70.00',
        currency: 'EUR',
        transactionId: 'pi_3TMxiDK5Ap4Um3Sp0c35isNt',
        appointmentDetails: {
          service: 'Physiotherapy session',
          expert: 'Patricia Mota',
          date: 'Tuesday, April 22, 2026',
          time: '2:00 PM',
          duration: '45 minutes',
        },
        locale: 'en',
      });

      expect(html).toContain('Matilde Henriques');
      expect(html).toContain('Physiotherapy session');
      expect(html).toContain('70.00');
      // 'Patricia Mota' is a real input value here, allow it.
      assertNoPlaceholderLeaks(html, ['Patricia Mota']);
    });
  });

  describe('renderMultibancoPaymentReminder', () => {
    test('renders real Multibanco voucher data without placeholder leaks', async () => {
      const html = await service.renderMultibancoPaymentReminder({
        customerName: 'Janeth Andre',
        entity: '11249',
        reference: '500300600',
        amount: '70.00',
        expiresAt: 'Friday, April 25, 2026',
        appointmentDetails: {
          service: 'Physical Therapy Appointment',
          expert: 'Patricia Mota',
          date: 'Tuesday, April 22, 2026',
          time: '11:00 AM',
          duration: '45',
        },
        reminderType: 'urgent',
        locale: 'en',
      });

      expect(html).toContain('Janeth Andre');
      expect(html).toContain('11249');
      expect(html).toContain('500300600');
      // 'Physical Therapy Appointment' is a real input value here.
      assertNoPlaceholderLeaks(html, ['Patricia Mota', 'Physical Therapy Appointment']);
    });
  });

  describe('renderMultibancoBookingPending', () => {
    test('renders real values; does not leak placeholder defaults', async () => {
      const html = await service.renderMultibancoBookingPending({
        customerName: 'Real Customer',
        expertName: 'Real Expert',
        serviceName: 'Real Service',
        appointmentDate: 'Real Date',
        appointmentTime: '14:00',
        timezone: 'Europe/Lisbon',
        duration: 60,
        multibancoEntity: '11249',
        multibancoReference: '500300600',
        multibancoAmount: '70.00',
        voucherExpiresAt: 'Friday, April 25, 2026',
        hostedVoucherUrl: 'https://stripe.com/voucher/real',
        locale: 'en',
      });

      expect(html).toContain('Real Customer');
      expect(html).toContain('Real Expert');
      expect(html).toContain('Real Service');
      expect(html).toContain('11249');
      assertNoPlaceholderLeaks(html);
    });
  });

  describe('renderExpertNewAppointment', () => {
    test('renders real expert + client values', async () => {
      const html = await service.renderExpertNewAppointment({
        expertName: 'Real Expert Name',
        clientName: 'Real Client Name',
        appointmentDate: 'Real Date',
        appointmentTime: '10:00 AM',
        timezone: 'Europe/Lisbon',
        appointmentDuration: '45 minutes',
        eventTitle: 'Real Event Title',
        locale: 'en',
      });

      expect(html).toContain('Real Expert Name');
      expect(html).toContain('Real Client Name');
      expect(html).toContain('Real Event Title');
      assertNoPlaceholderLeaks(html);
    });
  });

  describe('renderExpertPayoutNotification', () => {
    test('renders real payout values without leaking sample IDs', async () => {
      const html = await service.renderExpertPayoutNotification({
        expertName: 'Real Expert',
        amount: '52.50',
        currency: 'EUR',
        payoutDate: 'Friday, April 25, 2026',
        payoutMethod: 'Bank transfer',
        transactionId: 'po_real_123',
        locale: 'en',
      });

      expect(html).toContain('Real Expert');
      expect(html).toContain('52.50');
      assertNoPlaceholderLeaks(html);
    });
  });

  describe('renderExpertNotification', () => {
    test('renders real notification content', async () => {
      const html = await service.renderExpertNotification({
        expertName: 'Real Expert',
        notificationType: 'Account update',
        message: 'Your payout was processed.',
        actionUrl: 'https://eleva.care/dashboard',
        actionText: 'View dashboard',
      });

      expect(html).toContain('Real Expert');
      expect(html).toContain('Your payout was processed.');
      assertNoPlaceholderLeaks(html);
    });
  });

  describe('renderReservationExpired', () => {
    test('renders patient cancellation with real names', async () => {
      const html = await service.renderReservationExpired({
        recipientName: 'Real Customer',
        recipientType: 'patient',
        expertName: 'Real Expert',
        serviceName: 'Real Service',
        appointmentDate: 'Real Date',
        appointmentTime: '10:00 AM',
        timezone: 'Europe/Lisbon',
        locale: 'en',
      });

      expect(html).toContain('Real Customer');
      expect(html).toContain('Real Expert');
      assertNoPlaceholderLeaks(html);
    });
  });

  describe('renderRefundNotification', () => {
    test('renders real refund data without sample IDs leaking', async () => {
      const html = await service.renderRefundNotification({
        customerName: 'Real Customer',
        expertName: 'Real Expert',
        serviceName: 'Real Service',
        appointmentDate: 'Real Date',
        appointmentTime: '10:00 AM',
        originalAmount: '70.00',
        refundAmount: '70.00',
        currency: 'EUR',
        refundReason: 'time_range_overlap',
        transactionId: 'pi_real_123',
        locale: 'en',
      });

      expect(html).toContain('Real Customer');
      expect(html).toContain('70.00');
      assertNoPlaceholderLeaks(html);
    });
  });
});

describe('TemplateSelectionService — mapping correctness', () => {
  test('appointment-universal.reminder.patient resolves to AppointmentReminderEmail', () => {
    const template = templateSelectionService.selectTemplate({
      workflowId: 'appointment-universal',
      eventType: 'reminder',
      userSegment: 'patient',
      locale: 'en',
      templateVariant: 'default',
    });

    expect(template).not.toBeNull();
    // The reminder template's component name (or display name) should be one
    // of these — NOT AppointmentConfirmationTemplate, which was the original bug.
    expect(template?.name ?? template?.displayName).toMatch(/Reminder/i);
    expect(template?.name ?? template?.displayName).not.toMatch(/Confirmation/i);
  });

  test('appointment-universal.reminder.expert resolves to ExpertNewAppointmentTemplate', () => {
    const template = templateSelectionService.selectTemplate({
      workflowId: 'appointment-universal',
      eventType: 'reminder',
      userSegment: 'expert',
      locale: 'en',
      templateVariant: 'default',
    });

    expect(template).not.toBeNull();
    expect(template?.name ?? template?.displayName).toMatch(/Expert/i);
  });

  test('multibanco-payment-reminder.gentle.patient resolves correctly', () => {
    // Previously returned null because only `default` was registered.
    const template = templateSelectionService.selectTemplate({
      workflowId: 'multibanco-payment-reminder',
      eventType: 'gentle',
      userSegment: 'patient',
      locale: 'en',
      templateVariant: 'default',
    });

    expect(template).not.toBeNull();
  });

  test('multibanco-payment-reminder.urgent.patient resolves correctly', () => {
    const template = templateSelectionService.selectTemplate({
      workflowId: 'multibanco-payment-reminder',
      eventType: 'urgent',
      userSegment: 'patient',
      locale: 'en',
      templateVariant: 'default',
    });

    expect(template).not.toBeNull();
  });

  test('expert-payout-notification.payout.expert resolves correctly', () => {
    const template = templateSelectionService.selectTemplate({
      workflowId: 'expert-payout-notification',
      eventType: 'payout',
      userSegment: 'expert',
      locale: 'en',
      templateVariant: 'default',
    });

    expect(template).not.toBeNull();
  });

  test('expert-notification workflow is registered', () => {
    const template = templateSelectionService.selectTemplate({
      workflowId: 'expert-notification',
      eventType: 'default',
      userSegment: 'expert',
      locale: 'en',
      templateVariant: 'default',
    });

    expect(template).not.toBeNull();
  });
});

describe('PropAdapter — workflow payload → template props', () => {
  test('appointment-universal.confirmed.patient: customerName→clientName, serviceName→eventTitle, meetingUrl→meetLink', () => {
    const adapter = getPropAdapter({
      workflowId: 'appointment-universal',
      eventType: 'confirmed',
      userSegment: 'patient',
      locale: 'en',
      templateVariant: 'default',
    });

    const adapted = adapter({
      expertName: 'Patricia',
      customerName: 'Matilde',
      appointmentDate: 'Tomorrow',
      appointmentTime: '10:00',
      timezone: 'Europe/Lisbon',
      appointmentDuration: '45 minutes',
      serviceName: 'Physio',
      meetingUrl: 'https://meet.google.com/abc',
      notes: 'first session',
      locale: 'en',
    });

    expect(adapted).toMatchObject({
      expertName: 'Patricia',
      clientName: 'Matilde',
      eventTitle: 'Physio',
      meetLink: 'https://meet.google.com/abc',
    });
  });

  test('appointment-universal.reminder.patient: customerName→patientName, serviceName→appointmentType, meetingUrl→meetingLink', () => {
    const adapter = getPropAdapter({
      workflowId: 'appointment-universal',
      eventType: 'reminder',
      userSegment: 'patient',
      locale: 'en',
      templateVariant: 'default',
    });

    const adapted = adapter({
      expertName: 'Patricia',
      customerName: 'Matilde',
      serviceName: 'Physio',
      appointmentDate: 'Tomorrow',
      appointmentTime: '10:00',
      timezone: 'Europe/Lisbon',
      duration: 60,
      meetingUrl: 'https://meet.google.com/abc',
      locale: 'en',
    });

    expect(adapted).toMatchObject({
      patientName: 'Matilde',
      expertName: 'Patricia',
      appointmentType: 'Physio',
      meetingLink: 'https://meet.google.com/abc',
    });
  });

  test('payment-universal.success.patient: flattens appointmentDetails', () => {
    const adapter = getPropAdapter({
      workflowId: 'payment-universal',
      eventType: 'success',
      userSegment: 'patient',
      locale: 'en',
      templateVariant: 'default',
    });

    const adapted = adapter({
      customerName: 'Matilde',
      amount: '70.00',
      currency: 'EUR',
      transactionId: 'pi_real',
      appointmentDetails: {
        service: 'Physio',
        expert: 'Patricia',
        date: 'Tomorrow',
        time: '10:00',
        duration: '45 minutes',
      },
      locale: 'en',
    });

    expect(adapted).toMatchObject({
      customerName: 'Matilde',
      amount: '70.00',
      expertName: 'Patricia',
      serviceName: 'Physio',
      appointmentDate: 'Tomorrow',
      appointmentTime: '10:00',
    });
  });

  test('expert-payout-notification.payout.expert: amount→payoutAmount, payoutDate→expectedArrivalDate, transactionId→payoutId', () => {
    const adapter = getPropAdapter({
      workflowId: 'expert-payout-notification',
      eventType: 'payout',
      userSegment: 'expert',
      locale: 'en',
      templateVariant: 'default',
    });

    const adapted = adapter({
      expertName: 'Patricia',
      amount: '52.50',
      currency: 'EUR',
      payoutDate: 'Friday',
      transactionId: 'po_real',
      locale: 'en',
    });

    expect(adapted).toMatchObject({
      expertName: 'Patricia',
      payoutAmount: '52.50',
      expectedArrivalDate: 'Friday',
      payoutId: 'po_real',
    });
  });

  test('expert-notification.default.expert: notificationType→notificationTitle, message→notificationMessage', () => {
    const adapter = getPropAdapter({
      workflowId: 'expert-notification',
      eventType: 'default',
      userSegment: 'expert',
      locale: 'en',
      templateVariant: 'default',
    });

    const adapted = adapter({
      expertName: 'Patricia',
      notificationType: 'Account update',
      message: 'Your payout was processed.',
      actionUrl: 'https://eleva.care/dashboard',
      actionText: 'View dashboard',
    });

    expect(adapted).toMatchObject({
      expertName: 'Patricia',
      notificationTitle: 'Account update',
      notificationMessage: 'Your payout was processed.',
      actionUrl: 'https://eleva.care/dashboard',
      actionText: 'View dashboard',
    });
  });

  test('unregistered (workflowId, eventType, userSegment) returns identity adapter', () => {
    const adapter = getPropAdapter({
      workflowId: 'unknown-workflow',
      eventType: 'unknown',
      userSegment: 'admin',
      locale: 'en',
      templateVariant: 'default',
    });

    const data = { foo: 'bar' };
    expect(adapter(data)).toEqual(data);
  });
});
