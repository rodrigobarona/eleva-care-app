import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components';
import React from 'react';

import { EmailFooter } from '../components/EmailFooter';
import { EmailHeader } from '../components/EmailHeader';
import { emailDesignTokens } from '../design-tokens';

interface WelcomeEmailProps {
  userName?: string;
  dashboardUrl?: string;
  nextSteps?: Array<{
    title: string;
    description: string;
    actionUrl?: string;
    actionText?: string;
  }>;
  customization?: {
    socialLinks?: Array<{
      platform: string;
      url: string;
      label?: string;
    }>;
  };
  language?: 'en' | 'es' | 'pt' | 'pt-BR';
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * Modern Welcome Email Template
 * Inspired by clean SaaS design principles
 */
export function WelcomeEmail({
  userName = 'there',
  dashboardUrl,
  nextSteps = [
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
  customization = {},
  language = 'en',
  theme = 'light',
}: WelcomeEmailProps) {
  const tokens = emailDesignTokens;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eleva.care';
  const primaryColor = tokens.colors?.brand?.['eleva-primary'] || '#006D77';

  const buttonStyle = {
    backgroundColor: primaryColor,
    color: '#FFFFFF',
    padding: '12px 24px',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600' as const,
    fontSize: '14px',
    display: 'inline-block',
    fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
    letterSpacing: '-0.025em',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    border: 'none',
    cursor: 'pointer',
  };

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: `1px solid ${tokens.colors?.neutral?.[100] || '#F3F4F6'}`,
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  };

  const isDark = theme === 'dark';
  const textColor = isDark
    ? tokens.colors?.neutral?.[100] || '#F9FAFB'
    : tokens.colors?.neutral?.[800] || '#1F2937';

  return (
    <Html>
      <Head />
      <Preview>Welcome to Eleva Care! Let&apos;s get you started on your health journey.</Preview>
      <Body
        style={{
          backgroundColor: '#F8FAFC',
          fontFamily: tokens.typography?.families?.primary || 'DM Sans, sans-serif',
          fontSize: '16px',
          lineHeight: '1.6',
          color: tokens.colors?.neutral?.[700] || '#374151',
          margin: '0',
          padding: '0',
        }}
      >
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* Header */}
          <EmailHeader variant="minimal" theme={theme} customization={{}} />

          {/* Main Content */}
          <Section
            style={{
              padding: '40px 24px',
            }}
          >
            {/* Hero Section */}
            <div
              style={{
                textAlign: 'center' as const,
                marginBottom: '48px',
              }}
            >
              <Text
                style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: tokens.colors?.neutral?.[900] || '#111827',
                  margin: '0 0 16px 0',
                  letterSpacing: '-0.04em',
                  lineHeight: '1.2',
                }}
              >
                Welcome to Eleva Care, {userName}! 👋
              </Text>

              <Text
                style={{
                  fontSize: '18px',
                  lineHeight: '28px',
                  color: textColor,
                  margin: '0 0 24px 0',
                }}
              >
                We&apos;re thrilled to have you join the Eleva Care community! Your journey to
                better health starts here.
              </Text>

              {dashboardUrl && (
                <div style={{ marginBottom: '40px' }}>
                  <a href={`${baseUrl}${dashboardUrl}`} style={buttonStyle}>
                    Get Started →
                  </a>
                </div>
              )}
            </div>

            {/* Next Steps Section */}
            <div style={{ marginBottom: '40px' }}>
              <Text
                style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: tokens.colors?.neutral?.[900] || '#111827',
                  margin: '0 0 24px 0',
                  letterSpacing: '-0.025em',
                }}
              >
                What&apos;s next?
              </Text>

              {nextSteps.map((step, index) => (
                <div key={index} style={cardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '16px',
                    }}
                  >
                    {/* Step Number */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: primaryColor,
                        color: '#FFFFFF',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '600',
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Step Content */}
                    <div style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: tokens.colors?.neutral?.[900] || '#111827',
                          margin: '0 0 8px 0',
                          letterSpacing: '-0.025em',
                        }}
                      >
                        {step.title}
                      </Text>

                      <Text
                        style={{
                          fontSize: '14px',
                          color: textColor,
                          margin: '0 0 16px 0',
                          lineHeight: '1.5',
                        }}
                      >
                        {step.description}
                      </Text>

                      {step.actionUrl && step.actionText && (
                        <a
                          href={`${baseUrl}${step.actionUrl}`}
                          style={{
                            ...buttonStyle,
                            backgroundColor: 'transparent',
                            color: primaryColor,
                            border: `1px solid ${primaryColor}`,
                            padding: '8px 16px',
                            fontSize: '13px',
                            boxShadow: 'none',
                          }}
                        >
                          {step.actionText}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Help Section */}
            <div
              style={{
                backgroundColor: tokens.colors?.neutral?.[50] || '#F9FAFB',
                border: `1px solid ${tokens.colors?.neutral?.[100] || '#F3F4F6'}`,
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center' as const,
              }}
            >
              <Text
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: tokens.colors?.neutral?.[900] || '#111827',
                  margin: '0 0 8px 0',
                }}
              >
                Need help getting started?
              </Text>

              <Text
                style={{
                  fontSize: '14px',
                  color: textColor,
                  margin: '0 0 16px 0',
                }}
              >
                Our support team is here to help you every step of the way.
              </Text>

              <a
                href={`${baseUrl}/support`}
                style={{
                  color: primaryColor,
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '14px',
                  borderBottom: `1px solid ${primaryColor}`,
                  paddingBottom: '1px',
                }}
              >
                Contact Support
              </a>
            </div>

            <Text
              style={{
                fontSize: '16px',
                lineHeight: '24px',
                color: textColor,
                margin: '32px 0 0 0',
              }}
            >
              If you have any questions, we&apos;re here to help. Simply reply to this email or
              contact our support team.
            </Text>
          </Section>

          {/* Footer */}
          <EmailFooter
            variant="default"
            theme={theme}
            language={language}
            customization={{
              socialLinks: customization?.socialLinks || [],
            }}
          />
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;
