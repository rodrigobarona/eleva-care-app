// Import our email template components
import { BaseEmailTemplate } from '@/lib/email-templates/components/BaseEmailTemplate';
import { emailTemplates } from '@/lib/email-templates/content';
import { render } from '@react-email/render';
import DOMPurify from 'isomorphic-dompurify';
import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { Resend } from 'resend';

// Validate API key before initializing Resend client
if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set');
}

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses DOMPurify with email-safe configuration
 */
function sanitizeEmailHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    // Allow common email HTML elements and attributes
    ALLOWED_TAGS: [
      'div',
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'span',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'br',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'table',
      'tr',
      'td',
      'th',
      'thead',
      'tbody',
      'tfoot',
    ],
    ALLOWED_ATTR: [
      'style',
      'href',
      'src',
      'alt',
      'title',
      'target',
      'width',
      'height',
      'class',
      'id',
      'border',
      'cellpadding',
      'cellspacing',
      'align',
      'valign',
    ],
    // Allow data URLs for inline images (common in emails)
    ALLOW_DATA_ATTR: false,
    // Keep mailto: links
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    // Remove dangerous attributes
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    // Strip scripts and other dangerous elements
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
  });
}

/**
 * GET /api/test-email - Send a test email with predefined templates
 *
 * Query Parameters:
 * - to: Email address (default: 'delivered@resend.dev')
 * - locale: Language (en|es|pt|br, default: 'en')
 * - userRole: User role (patient|expert|admin, default: 'patient')
 * - darkMode: Enable dark mode (true|false, default: false)
 * - highContrast: Enable high contrast (true|false, default: false)
 * - variant: Template variant (default|minimal|branded, default: 'default')
 * - type: Email type (welcome|expert|appointment|payment, default: 'welcome')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters with defaults
    const config = {
      to: searchParams.get('to') || 'delivered@resend.dev',
      locale: (searchParams.get('locale') || 'en') as 'en' | 'es' | 'pt' | 'pt-BR',
      userRole: (searchParams.get('userRole') || 'patient') as 'patient' | 'expert' | 'admin',
      darkMode: searchParams.get('darkMode') === 'true',
      highContrast: searchParams.get('highContrast') === 'true',
      variant: (searchParams.get('variant') || 'default') as 'default' | 'minimal' | 'branded',
      type: searchParams.get('type') || 'welcome',
    };

    // Get content for the specified type from extracted templates
    const content =
      emailTemplates[config.type as keyof typeof emailTemplates] || emailTemplates.welcome;
    const subject = content.subject[config.locale] || content.subject.en;
    const preheader = content.preheader[config.locale] || content.preheader.en;
    const body = content.body[config.locale] || content.body.en;

    // Render options for the email template
    const renderOptions = {
      locale: config.locale,
      userRole: config.userRole,
      rtl: false,
      darkMode: config.darkMode,
      highContrast: config.highContrast,
      previewMode: false,
      variant: config.variant,
    };

    // Create the email component with proper children prop structure and sanitized HTML
    const EmailComponent = () =>
      React.createElement(
        BaseEmailTemplate,
        {
          subject: subject,
          preheader: preheader,
          renderOptions: renderOptions,
        },
        React.createElement('div', {
          dangerouslySetInnerHTML: { __html: sanitizeEmailHTML(body) },
        }),
      );

    // Render the React component to HTML
    const html = await render(React.createElement(EmailComponent));

    // Send via Resend
    const response = await resend.emails.send({
      from: 'Eleva Care Testing <testing@resend.dev>',
      to: [config.to],
      subject: `[TEST] ${subject}`,
      html: html,
      headers: {
        'X-Test-Type': config.type,
        'X-Template-Variant': config.variant,
        'X-User-Role': config.userRole,
        'X-Locale': config.locale,
        'X-Entity-Ref-ID': `api-test-${Date.now()}`, // Prevent Gmail threading
      },
      tags: [
        { name: 'environment', value: 'test' },
        { name: 'source', value: 'api' },
        { name: 'template-type', value: config.variant },
        { name: 'user-role', value: config.userRole },
        { name: 'locale', value: config.locale },
        { name: 'email-type', value: config.type },
      ],
    });

    if (response.error) {
      return NextResponse.json(
        {
          success: false,
          error: response.error.message,
          config,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      emailId: response.data?.id,
      config,
      message: `Test email sent successfully to ${config.to}`,
      dashboardUrl: 'https://resend.com/emails',
    });
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to send test email',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/test-email - Send a test email with custom content
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      to = 'delivered@resend.dev',
      subject = 'Test Email from Eleva Care',
      content = '<h1>Hello from Eleva Care!</h1><p>This is a test email.</p>',
      locale = 'en',
      userRole = 'patient',
      darkMode = false,
      highContrast = false,
      variant = 'default',
    } = body;

    const renderOptions = {
      locale,
      userRole,
      rtl: false,
      darkMode,
      highContrast,
      previewMode: false,
      variant,
    };

    // Create the email component with custom content and proper children prop structure with sanitized HTML
    const EmailComponent = () =>
      React.createElement(
        BaseEmailTemplate,
        {
          subject: subject,
          preheader: 'Custom test email',
          renderOptions: renderOptions,
        },
        React.createElement('div', {
          dangerouslySetInnerHTML: { __html: sanitizeEmailHTML(content) },
        }),
      );

    // Render the React component to HTML
    const html = await render(React.createElement(EmailComponent));

    // Send via Resend
    const response = await resend.emails.send({
      from: 'Eleva Care Testing <testing@resend.dev>',
      to: [to],
      subject: `[TEST] ${subject}`,
      html: html,
      headers: {
        'X-Test-Type': 'custom',
        'X-Template-Variant': variant,
        'X-User-Role': userRole,
        'X-Locale': locale,
        'X-Entity-Ref-ID': `api-custom-${Date.now()}`,
      },
      tags: [
        { name: 'environment', value: 'test' },
        { name: 'source', value: 'api-custom' },
        { name: 'template-type', value: variant },
        { name: 'user-role', value: userRole },
        { name: 'locale', value: locale },
      ],
    });

    if (response.error) {
      return NextResponse.json(
        {
          success: false,
          error: response.error.message,
          config: { to, subject, locale, userRole, darkMode, highContrast, variant },
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      emailId: response.data?.id,
      config: { to, subject, locale, userRole, darkMode, highContrast, variant },
      message: `Custom test email sent successfully to ${to}`,
      dashboardUrl: 'https://resend.com/emails',
    });
  } catch (error) {
    console.error('Custom email test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to send custom test email',
      },
      { status: 500 },
    );
  }
}
