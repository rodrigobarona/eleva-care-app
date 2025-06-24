// Centralized template registry for easy access
import { appointmentTemplate } from './appointment';
import { expertTemplate } from './expert';
import { paymentTemplate } from './payment';
import type { EmailContentType } from './types';
import { welcomeTemplate } from './welcome';

// Export all email content templates
export { welcomeTemplate } from './welcome';
export { expertTemplate } from './expert';
export { appointmentTemplate } from './appointment';
export { paymentTemplate } from './payment';

// Export types
export type { LocalizedContent, EmailContentType } from './types';

export const emailTemplates: Record<string, EmailContentType> = {
  welcome: welcomeTemplate,
  expert: expertTemplate,
  appointment: appointmentTemplate,
  payment: paymentTemplate,
};
