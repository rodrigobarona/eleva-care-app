import { render } from '@react-email/render';
import { NextRequest, NextResponse } from 'next/server';
import React from 'react';

import { WelcomeEmail } from '../../../../lib/email-templates/templates/WelcomeEmail';

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Test email endpoint not available in production' },
      { status: 404 },
    );
  }

  try {
    const { to, template = 'welcome', ...props } = await request.json();

    if (!to) {
      return NextResponse.json({ error: 'Email recipient is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    let EmailComponent;
    let subject = 'Test Email from Eleva Care';

    // Select the template
    switch (template) {
      case 'welcome':
        EmailComponent = WelcomeEmail;
        subject = 'Welcome to Eleva Care!';
        break;
      default:
        return NextResponse.json({ error: 'Unknown template' }, { status: 400 });
    }

    // Prepare email props
    const emailProps = {
      userName: props.userName || 'Test User',
      dashboardUrl: props.dashboardUrl || '/dashboard',
      customization: props.customization || {},
      language: props.language || 'en',
      theme: props.theme || 'light',
      ...props,
    };

    // Render the email using React.createElement
    const emailHtml = await render(React.createElement(EmailComponent, emailProps));
    const emailText = await render(React.createElement(EmailComponent, emailProps), {
      plainText: true,
    });

    // In development, you might want to:
    // 1. Log the email instead of sending
    // 2. Send to a test email service like Mailtrap
    // 3. Send via your configured email service

    if (process.env.RESEND_API_KEY) {
      // If you have Resend configured, send the email
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const data = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'test@eleva.care',
        to: [to],
        subject,
        html: emailHtml,
        text: emailText,
      });

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        data,
        preview: {
          html: emailHtml,
          text: emailText,
        },
      });
    } else {
      // If no email service configured, just return the rendered email
      console.log('📧 Test Email would be sent to:', to);
      console.log('📧 Subject:', subject);
      console.log('📧 HTML Length:', emailHtml.length);

      return NextResponse.json({
        success: true,
        message: 'Email rendered successfully (not sent - no email service configured)',
        preview: {
          html: emailHtml,
          text: emailText,
        },
      });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
