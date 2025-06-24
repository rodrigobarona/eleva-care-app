// Email Templates Preview Index
// This file is used by React Email's preview server to display templates
import { WelcomeEmail } from '../lib/email-templates/templates/WelcomeEmail';

export { WelcomeEmail };

// Example: You can add more templates here as you create them
// export { default as PasswordResetEmail } from '../lib/email-templates/templates/PasswordResetEmail';
// export { default as AppointmentConfirmationEmail } from '../lib/email-templates/templates/AppointmentConfirmationEmail';

// For preview purposes, you can also export component props examples
export const WelcomeEmailPreview = () => {
  return (
    <WelcomeEmail
      userName="Dr. Sarah Johnson"
      dashboardUrl="/dashboard"
      nextSteps={[
        {
          title: 'Complete your health profile',
          description: 'Help us personalize your care experience with detailed health information',
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
        {
          title: 'Schedule your first consultation',
          description: 'Book a convenient time with your preferred healthcare provider',
          actionUrl: '/book',
          actionText: 'Schedule Now',
        },
      ]}
      customization={{
        socialLinks: [
          { platform: 'twitter', url: 'https://twitter.com/elevacare', label: 'Twitter' },
          {
            platform: 'linkedin',
            url: 'https://linkedin.com/company/elevacare',
            label: 'LinkedIn',
          },
        ],
      }}
      language="en"
      theme="light"
    />
  );
};
