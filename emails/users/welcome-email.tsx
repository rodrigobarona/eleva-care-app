import * as React from 'react';
import { EmailButton, EmailLayout } from '@/components/emails';
import { Heading, Section, Text } from '@react-email/components';

interface WelcomeEmailProps {
  userName?: string;
  dashboardUrl?: string;
  nextSteps?: Array<{
    title: string;
    description: string;
    actionUrl: string;
    actionText: string;
  }>;
}

export default function WelcomeEmailTemplate({
  userName = 'User',
  dashboardUrl = 'https://eleva.care/dashboard',
  nextSteps = [
    {
      title: 'Complete Your Profile',
      description: 'Add your personal information and health details',
      actionUrl: 'https://eleva.care/profile',
      actionText: 'Complete Profile',
    },
    {
      title: 'Browse Healthcare Experts',
      description: 'Find and connect with qualified healthcare professionals',
      actionUrl: 'https://eleva.care/experts',
      actionText: 'Find Experts',
    },
  ],
}: WelcomeEmailProps) {
  const subject = `Welcome to Eleva Care, ${userName}!`;
  const previewText = `Start your journey to better health with personalized expert care`;

  return (
    <EmailLayout
      subject={subject}
      previewText={previewText}
      headerVariant="branded"
      footerVariant="default"
    >
      <Heading
        style={{
          color: '#006D77',
          fontSize: '28px',
          marginBottom: '16px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        Welcome to Eleva Care, {userName}! 🌟
      </Heading>

      <Text
        style={{
          color: '#4a5568',
          fontSize: '18px',
          lineHeight: '1.6',
          textAlign: 'center',
          marginBottom: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        We&apos;re excited to have you join our community dedicated to women&apos;s health and
        wellness.
      </Text>

      <Section
        style={{
          backgroundColor: '#f0fdff',
          padding: '24px',
          borderRadius: '12px',
          margin: '24px 0',
          textAlign: 'center',
        }}
      >
        <Text
          style={{
            color: '#006D77',
            fontSize: '16px',
            lineHeight: '1.6',
            marginBottom: '20px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          Get started by accessing your personalized dashboard:
        </Text>
        <EmailButton href={dashboardUrl} variant="primary" size="lg">
          Go to Dashboard
        </EmailButton>
      </Section>

      <Heading
        style={{
          color: '#2d3748',
          fontSize: '20px',
          marginTop: '32px',
          marginBottom: '16px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        Next Steps to Get Started:
      </Heading>

      {nextSteps.map((step, index) => (
        <Section
          key={index}
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            padding: '20px',
            borderRadius: '8px',
            margin: '16px 0',
          }}
        >
          <Heading
            style={{
              color: '#2d3748',
              fontSize: '16px',
              margin: '0 0 8px 0',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {index + 1}. {step.title}
          </Heading>
          <Text
            style={{
              color: '#718096',
              fontSize: '14px',
              lineHeight: '1.5',
              margin: '0 0 16px 0',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {step.description}
          </Text>
          <EmailButton href={step.actionUrl} variant="outline" size="sm">
            {step.actionText}
          </EmailButton>
        </Section>
      ))}

      <Section
        style={{
          textAlign: 'center',
          marginTop: '32px',
          padding: '24px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
        }}
      >
        <Text
          style={{
            color: '#4a5568',
            fontSize: '16px',
            lineHeight: '1.6',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          Questions? We&apos;re here to help!
          <br />
          Contact our support team at{' '}
          <a href="mailto:support@eleva.care" style={{ color: '#006D77', textDecoration: 'none' }}>
            support@eleva.care
          </a>
        </Text>
      </Section>
    </EmailLayout>
  );
}

// Sample data for React Email preview
WelcomeEmailTemplate.PreviewProps = {
  userName: 'Dr. João Silva',
  dashboardUrl: '/dashboard',
  nextSteps: [
    {
      title: 'Complete your health profile',
      description: 'Help us personalize your care experience with detailed health information',
      actionUrl: '/profile/complete',
      actionText: 'Complete Profile',
    },
    {
      title: 'Browse expert providers',
      description: 'Find healthcare professionals that match your specific needs and preferences',
      actionUrl: '/providers',
      actionText: 'View Providers',
    },
  ],
} as WelcomeEmailProps;
