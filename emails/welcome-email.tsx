import * as React from 'react';

import { WelcomeEmail } from '../lib/email-templates/templates/WelcomeEmail';

export default function WelcomeEmailTemplate() {
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
}

// Define preview props for React Email
WelcomeEmailTemplate.PreviewProps = {
  userName: 'Dr. Sarah Johnson',
  dashboardUrl: '/dashboard',
  nextSteps: [
    {
      title: 'Complete your health profile',
      description: 'Help us personalize your care experience',
      actionUrl: '/profile/complete',
      actionText: 'Complete Profile',
    },
    {
      title: 'Browse expert providers',
      description: 'Find healthcare professionals that match your needs',
      actionUrl: '/providers',
      actionText: 'View Providers',
    },
    {
      title: 'Schedule your first consultation',
      description: 'Book a convenient time with your preferred provider',
      actionUrl: '/book',
      actionText: 'Schedule Now',
    },
  ],
  customization: {
    socialLinks: [
      { platform: 'twitter', url: 'https://twitter.com/elevacare', label: 'Twitter' },
      { platform: 'linkedin', url: 'https://linkedin.com/company/elevacare', label: 'LinkedIn' },
    ],
  },
  language: 'en',
  theme: 'light',
};
