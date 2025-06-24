# Email Template Infrastructure - Eleva Care

A comprehensive, accessible, and scalable email template system with the distinctive Eleva Care branding. Features Deep Teal (#006D77) and Soft Coral (#E29578) color palette with DM Sans, Lora, and IBM Plex Mono typography.

## 🎯 Features

### 🎨 **Design System**

- **WCAG 2.1 AA compliant** color system and typography
- **Multi-language support** (EN, ES, PT, FR, DE, AR, HE)
- **RTL language support** for Arabic and Hebrew
- **Dark mode** and **High contrast** variants
- **Email client compatibility** (Outlook, Gmail, Apple Mail, etc.)

### 🔧 **Template Engine**

- **Dynamic template selection** based on workflow and user context
- **Personalization rules** with conditional logic
- **Template validation** with performance and accessibility checks
- **Caching** for optimal performance
- **Analytics integration** for tracking engagement

### ♿ **Accessibility**

- **Screen reader optimization** with semantic HTML
- **Keyboard navigation** support
- **Skip links** for better navigation
- **Alt text** enforcement for images
- **Focus indicators** for interactive elements

### 🌐 **Internationalization**

- **Multi-language templates** with automatic RTL detection
- **Cultural adaptation** for region-specific content
- **Timezone intelligence** for date/time formatting
- **Currency localization** for payment amounts

## 📁 Project Structure

```
lib/email-templates/
├── types.ts                     # TypeScript interfaces and types
├── design-tokens.ts             # Design system tokens and utilities
├── index.ts                     # Main exports and utilities
├── README.md                    # This documentation
├── components/
│   ├── BaseEmailTemplate.tsx    # Foundation template wrapper
│   ├── EmailHeader.tsx          # Consistent header component
│   └── EmailFooter.tsx          # Legal-compliant footer
├── engine/
│   └── EmailTemplateEngine.ts   # Core template rendering engine
└── templates/                   # Actual email templates (to be created)
    ├── appointment/
    ├── user/
    ├── expert/
    ├── payment/
    └── generic/
```

## 🚀 Quick Start

### 1. Start the Development Server

```bash
# Start your Next.js app
pnpm dev

# Your app will be available at http://localhost:3000
```

### 2. Access Email Development Tools

Navigate to: **http://localhost:3000/dev/emails**

This page provides:

- **Live Preview**: See exactly how your emails will look
- **HTML/Text View**: Inspect the generated code
- **Test Email Sending**: Send emails to real inboxes
- **Template Selection**: Switch between different email templates

## 📧 Available Preview Methods

### Method 1: In-App Preview (Recommended)

- Go to `http://localhost:3000/dev/emails`
- Select your template from the sidebar
- Use the "Preview" tab to see the visual result
- Switch to "HTML" or "Text" tabs to see the code

### Method 2: React Email CLI

```bash
# Start React Email preview server
pnpm email:preview

# Opens at http://localhost:3001
```

### Method 3: Download HTML

- In the development page, click "Download HTML"
- Open the file in your browser
- Or send it to colleagues for review

## 🧪 Testing Email Delivery

### Send Test Emails

1. **In the Development Page**:

   - Enter your email address in the "Test Email" section
   - Click "Send Test Email"
   - Check your inbox (and spam folder)

2. **Using the API Directly**:
   ```bash
   curl -X POST http://localhost:3000/api/dev/send-test-email \
     -H "Content-Type: application/json" \
     -d '{
       "to": "your-email@example.com",
       "template": "welcome",
       "userName": "Test User"
     }'
   ```

### Email Service Configuration

The system supports multiple email backends:

**Option 1: Resend (Recommended)**

```env
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@eleva.care
```

**Option 2: No Email Service (Development)**

- Emails will be logged to console
- HTML preview will be returned in API response

## 🎨 Creating New Templates

### 1. Create the Template Component

```tsx
// lib/email-templates/templates/YourNewEmail.tsx
import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components';

import { EmailFooter } from '../components/EmailFooter';
import { EmailHeader } from '../components/EmailHeader';

export function YourNewEmail({ userName = 'User' }) {
  return (
    <Html>
      <Head />
      <Preview>Your email preview text</Preview>
      <Body>
        <Container>
          <EmailHeader variant="minimal" />

          <Section>
            <Text>Hello {userName}!</Text>
            {/* Your email content */}
          </Section>

          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}
```

### 2. Add to Preview System

Update `emails/index.tsx`:

```tsx
export { default as YourNewEmail } from '../lib/email-templates/templates/YourNewEmail';
```

Update `app/dev/emails/page.tsx`:

```tsx
const emailTemplates: EmailTemplate[] = [
  // ... existing templates
  {
    name: 'Your New Email',
    component: YourNewEmail,
    props: {
      userName: 'Test User',
      // ... other props
    },
  },
];
```

### 3. Add to API Endpoint

Update `app/api/dev/send-test-email/route.ts`:

```tsx
import YourNewEmail from '../../../../lib/email-templates/templates/YourNewEmail';

// In the switch statement:
case 'your-new-email':
  EmailComponent = YourNewEmail;
  subject = 'Your Subject Here';
  break;
```

## 🎯 Best Practices

### Email Design

- **Use System Colors**: Leverage `emailDesignTokens` for consistent branding
- **Mobile First**: Test on mobile devices and small screens
- **Accessibility**: Include alt text for images and proper heading hierarchy
- **Email Client Testing**: Test in Gmail, Outlook, Apple Mail, etc.

### Development Workflow

1. **Design First**: Create the template with static content
2. **Preview**: Use the development page to see visual results
3. **Test Sending**: Send to real email addresses
4. **Iterate**: Refine based on how it looks in actual email clients
5. **Cross-client Testing**: Test in multiple email clients

### Performance

- **Optimize Images**: Use absolute URLs and appropriate sizes
- **Inline Styles**: React Email handles this automatically
- **Keep it Lightweight**: Aim for under 100KB total size

## 🔧 Troubleshooting

### Email Not Sending

1. Check your `RESEND_API_KEY` in `.env.local`
2. Verify the "from" email domain is configured in Resend
3. Check the console for error messages
4. Ensure you're not in production mode

### Preview Not Loading

1. Restart the development server
2. Check for TypeScript errors in the template
3. Verify all imports are correct
4. Check browser console for JavaScript errors

### Styling Issues

1. Use inline styles or React Email components
2. Avoid external CSS files
3. Test in the actual email development page
4. Remember email clients have limited CSS support

## 📱 Mobile Testing

Email templates are automatically responsive, but you should test:

1. **Desktop**: Full preview in development page
2. **Mobile**: Resize browser window or use developer tools
3. **Real Devices**: Send test emails to your phone
4. **Email Apps**: Test in Gmail app, Apple Mail, Outlook mobile

## 🚀 Production Deployment

Before deploying:

1. **Remove Development Routes**: The `/dev/emails` page and API are automatically disabled in production
2. **Environment Variables**: Ensure production email service credentials are set
3. **Test in Staging**: Send test emails in your staging environment
4. **Monitor**: Set up logging for email delivery tracking

## 📚 Additional Resources

- [React Email Documentation](https://react.email/docs)
- [Email Client CSS Support](https://www.campaignmonitor.com/css/)
- [Email Accessibility Guidelines](https://www.emailonacid.com/blog/article/email-development/email-accessibility-in-2017/)
- [Resend Documentation](https://resend.com/docs)

---

Need help? Check the console logs or reach out to the development team!

## 🏗️ Architecture

### Template Engine Flow

1. **Template Selection**: Based on workflow ID, event type, and user context
2. **Personalization**: Apply dynamic rules based on user data
3. **Rendering**: Generate HTML with React Email components
4. **Validation**: Check accessibility, performance, and structure
5. **Analytics**: Track metrics and engagement

### Component Hierarchy

```
BaseEmailTemplate
├── EmailHeader (brand, navigation, user context)
├── Main Content (dynamic template content)
└── EmailFooter (legal, unsubscribe, contact info)
```

## 🎨 Design System

### Color Palette

```typescript
import { emailDesignTokens } from '@/lib/email-templates';

// Eleva brand colors
emailDesignTokens.colors.primary[500]; // #006D77 (Eleva Deep Teal)
emailDesignTokens.colors.brand['eleva-primary']; // #006D77 (Deep Teal)
emailDesignTokens.colors.brand['eleva-secondary']; // #E29578 (Soft Coral)
emailDesignTokens.colors.brand['eleva-accent']; // #E0FBFC (Pale Lavender)
emailDesignTokens.colors.semantic.success; // #83C5BE (Eleva Sage Green)
```

### Typography

```typescript
// Eleva font families
emailDesignTokens.typography.families.primary; // "DM Sans" font stack
emailDesignTokens.typography.families.heading; // "Lora" serif for headings
emailDesignTokens.typography.families.mono; // "IBM Plex Mono" for code
emailDesignTokens.typography.sizes.base; // 16px base size
emailDesignTokens.typography.weights.semibold; // 600 weight
```

### Spacing

```typescript
// Consistent spacing scale
emailDesignTokens.spacing.sm; // 8px
emailDesignTokens.spacing.md; // 16px
emailDesignTokens.spacing.lg; // 24px
emailDesignTokens.spacing.xl; // 32px
```

## 🔧 Template Configuration

### Workflow Configuration

```typescript
import { createTemplateConfig } from '@/lib/email-templates';

const appointmentConfig = createTemplateConfig(
  'appointmentWorkflow',
  {
    reminder: 'appointment-reminder',
    cancelled: 'appointment-cancelled',
    confirmation: 'appointment-confirmation',
  },
  {
    templateVariants: ['default', 'urgent', 'reminder'],
    personalizationRules: [
      {
        condition: 'userRole === "expert"',
        action: 'replace',
        target: 'subject',
        value: 'New appointment with {{clientName}}',
        priority: 1,
      },
    ],
    deliveryOptions: {
      provider: 'resend',
      from: 'appointments@eleva.care',
      priority: 'normal',
    },
    multiChannel: {
      email: true,
      inApp: true,
      push: true,
      sms: false,
    },
  },
);
```

### Personalization Rules

```typescript
// Conditional content based on user data
{
  condition: 'amount > 100',           // JavaScript expression
  action: 'show',                      // show|hide|replace|modify
  target: 'highValueNotice',           // Element to target
  priority: 2,                         // Rule priority (lower = higher priority)
}
```

## ✅ Validation and Testing

### Template Validation

```typescript
import { emailTemplateEngine } from '@/lib/email-templates';

const validation = await emailTemplateEngine.validateTemplate('appointment-confirmation', {
  expertName: 'Dr. Silva',
  clientName: 'João',
});

console.log(validation.isValid); // true/false
console.log(validation.accessibility.wcagLevel); // 'AA'
console.log(validation.performance.size); // Size in bytes
```

### Accessibility Scoring

```typescript
import { getAccessibilityScore } from '@/lib/email-templates';

const score = getAccessibilityScore(htmlContent); // 0-100
```

### Performance Checking

```typescript
import { isEmailSizeOptimal } from '@/lib/email-templates';

const isOptimal = isEmailSizeOptimal(htmlContent); // < 100KB
```

## 📊 Analytics Integration

### Recording Metrics

```typescript
emailTemplateEngine.recordAnalytics('appointment-confirmation', {
  metrics: {
    sent: 100,
    delivered: 98,
    opened: 75,
    clicked: 25,
  },
  performance: {
    deliveryRate: 0.98,
    openRate: 0.77,
    clickRate: 0.33,
  },
});
```

### Retrieving Analytics

```typescript
const analytics = emailTemplateEngine.getAnalytics('appointment-confirmation');
console.log(analytics?.performance.openRate); // 0.77
```

## 🌐 Internationalization

### Supported Locales

- **English** (`en`) - Default
- **Spanish** (`es`) - Spain and Latin America
- **Portuguese** (`pt`) - Portugal and Brazil
- **French** (`fr`) - France and Canada
- **German** (`de`) - Germany and Austria
- **Arabic** (`ar`) - RTL support
- **Hebrew** (`he`) - RTL support

### RTL Language Support

RTL languages (Arabic, Hebrew) automatically get:

- `dir="rtl"` attribute
- Right-aligned text
- Reversed layout components
- Appropriate spacing adjustments

### Adding New Languages

1. Add locale to `SupportedLocale` type in `types.ts`
2. Update translations in component files
3. Add locale-specific design tokens if needed
4. Test RTL behavior for new RTL languages

## 🔒 Security and Compliance

### GDPR Compliance

- **Unsubscribe links** in all marketing emails
- **Email preferences** management
- **Data processing** transparency
- **Consent tracking** integration

### HIPAA Compliance

- **No PHI** in email subjects or previews
- **Secure links** for sensitive content
- **Audit logging** for healthcare communications
- **Access controls** for template management

### SOC 2 Compliance

- **Template validation** and approval workflows
- **Change tracking** for all templates
- **Performance monitoring** and alerting
- **Security scanning** for email content

## 🚀 Development Workflow

### Creating New Templates

1. **Create template component** in appropriate category folder
2. **Add template mapping** to EmailTemplateEngine
3. **Define validation rules** for required data
4. **Add translations** for multiple locales
5. **Test accessibility** and performance
6. **Document usage** and data requirements

### Template Categories

- **Appointment** - Booking, reminders, cancellations
- **User Management** - Welcome, verification, security
- **Payment** - Confirmations, failures, refunds
- **Expert Management** - Onboarding, approvals, payouts
- **Marketplace** - Discovery, recommendations, updates
- **System** - Alerts, maintenance, health checks

### Testing Checklist

- [ ] **Visual testing** across email clients
- [ ] **Accessibility testing** with screen readers
- [ ] **Performance testing** for render time and size
- [ ] **Internationalization testing** for all supported locales
- [ ] **Dark mode testing** for visual consistency
- [ ] **High contrast testing** for accessibility
- [ ] **Mobile responsive testing** on different devices

## 📈 Performance Optimization

### Caching Strategy

- **Template components** cached after first load
- **Validation results** cached per template/data combination
- **Rendered HTML** optionally cached for static content

### Size Optimization

- **Image optimization** with WebP fallbacks
- **CSS inlining** for email client compatibility
- **HTML minification** in production
- **Font subsetting** for international characters

### Render Performance

- **Lazy loading** of template components
- **Streaming rendering** for large templates
- **Background processing** for non-critical emails
- **CDN delivery** for static assets

## 🔧 Configuration

### Environment Variables

```env
RESEND_API_KEY=your_resend_api_key
RESEND_EMAIL_FROM=notifications@eleva.care
RESEND_EMAIL_BOOKINGS_FROM=appointments@eleva.care
NEXT_PUBLIC_APP_URL=https://eleva.care
```

### Template Engine Settings

```typescript
// Customize default configuration
emailTemplateEngine.updateTemplateConfig('appointmentWorkflow', {
  deliveryOptions: {
    provider: 'sendgrid', // Switch provider
    priority: 'high', // Increase priority
  },
  multiChannel: {
    sms: true, // Enable SMS notifications
  },
});
```

## 🐛 Troubleshooting

### Common Issues

1. **Template not found**

   - Check template ID mapping in EmailTemplateEngine
   - Ensure template component is exported correctly

2. **Rendering errors**

   - Validate required data properties
   - Check for TypeScript type mismatches
   - Review error logs for specific failures

3. **Accessibility issues**

   - Use validation results to identify problems
   - Test with actual screen readers
   - Check color contrast ratios

4. **Performance problems**
   - Monitor render times and email sizes
   - Optimize images and CSS
   - Enable template caching

### Debug Mode

```typescript
// Enable detailed logging
process.env.EMAIL_TEMPLATE_DEBUG = 'true';

// Clear caches for development
emailTemplateEngine.clearCaches();
```

## 📚 Resources

- [React Email Documentation](https://react.email/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Email Client CSS Support](https://www.campaignmonitor.com/css/)
- [Accessibility Testing Tools](https://www.accessibility-developer-guide.com/tools/)

## 🤝 Contributing

1. Follow existing code patterns and TypeScript types
2. Add comprehensive tests for new templates
3. Update documentation for new features
4. Ensure WCAG 2.1 AA compliance
5. Test across multiple email clients and devices

---

**Version**: 1.0.0  
**Last Updated**: June 2024  
**Maintainer**: Eleva Care Engineering Team
