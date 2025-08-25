// Manual mock for lib/novu-email-service.ts
// Mirror: lib/novu-email-service.ts exports elevaEmailService instance and other functions

// Mock TemplateSelectionService class
export class TemplateSelectionService {
  selectTemplate = jest.fn().mockReturnValue(null);
  selectTemplateWithContext = jest.fn().mockReturnValue({
    template: null,
    metadata: {},
  });
  selectTemplateForExperiment = jest.fn().mockReturnValue({
    template: null,
    selectedVariant: undefined,
  });
}

// Mock instance
export const templateSelectionService = new TemplateSelectionService();

// Mock ElevaEmailService class
export class ElevaEmailService {
  renderEmailWithSelection = jest.fn().mockResolvedValue({
    html: '<html>Mock Email</html>',
    metadata: {},
  });
  renderAppointmentConfirmation = jest
    .fn()
    .mockResolvedValue('<html>Mock Appointment Email</html>');
  renderWelcomeEmail = jest.fn().mockResolvedValue('<html>Mock Welcome Email</html>');
  renderAppointmentReminder = jest.fn().mockResolvedValue('<html>Mock Reminder Email</html>');
  renderPaymentConfirmation = jest.fn().mockResolvedValue('<html>Mock Payment Email</html>');
  renderMultibancoPaymentReminder = jest
    .fn()
    .mockResolvedValue('<html>Mock Multibanco Reminder</html>');
  renderExpertPayoutNotification = jest
    .fn()
    .mockResolvedValue('<html>Mock Payout Notification</html>');
  renderExpertNotification = jest.fn().mockResolvedValue('<html>Mock Expert Notification</html>');
  renderGenericEmail = jest.fn().mockResolvedValue('<html>Mock Generic Email</html>');
  renderMultibancoBookingPending = jest
    .fn()
    .mockResolvedValue('<html>Mock Multibanco Pending</html>');
  renderSimpleNotification = jest.fn().mockReturnValue('<html>Mock Simple Notification</html>');
}

// Mock singleton instance
export const elevaEmailService = new ElevaEmailService();

// Mock functions
export const sendNovuEmailEnhanced = jest.fn().mockResolvedValue({ success: true });
export const sendNovuEmail = jest.fn().mockResolvedValue({ success: true });
export const sendNovuEmailWithCustomTemplate = jest.fn().mockResolvedValue({ success: true });
export const sendDirectResendEmail = jest.fn().mockResolvedValue({ success: true });
export const getSubscriberForEmail = jest.fn().mockResolvedValue({
  subscriberId: 'test-user-id',
});
export const triggerNovuWorkflow = jest.fn().mockResolvedValue({ success: true });
