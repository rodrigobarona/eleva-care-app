# Eleva Care Email Templates

Centralized email system using React Email with standardized header/footer components, consistent design system, internationalization (i18n), and theme support.

## 🌍 Internationalization & Themes

The email system supports multiple languages and both light/dark themes:

**Supported Languages:**

- English (`en`)
- Portuguese (`pt`)
- Spanish (`es`)
- Brazilian Portuguese (`br`)

**Theme Support:**

- Light theme (default) - Professional healthcare design
- Dark theme - Enhanced accessibility and user preference

**Usage Example:**

```tsx
import {
  createWelcomeEmailI18n,
  detectUserLocale,
  detectUserTheme,
  triggerWelcomeEmail,
} from '@/emails';

// Auto-detect user preferences and send email
const locale = detectUserLocale(userPreferences, acceptLanguageHeader, countryCode);
const theme = detectUserTheme(userPreferences, systemPreference);

await triggerWelcomeEmail({
  subscriberId: user.id,
  email: user.email,
  userName: user.name,
  firstName: user.firstName,
  locale,
  theme,
});
```

### Novu Integration

All email templates support multilingual workflows through Novu:

```tsx
import { EMAIL_WORKFLOWS, sendWelcomeEmailAuto } from '@/emails';

// Automatically detect user locale and theme
await sendWelcomeEmailAuto(user.id, user.email, user.name, user.firstName, {
  acceptLanguage: req.headers['accept-language'],
  countryCode: user.countryCode,
  userPreferences: user.preferences,
});
```

## 📁 Organization

All email templates are organized by topic for better maintainability and are now using our standardized `EmailLayout` component with i18n support:

```
emails/
├── appointments/     # Appointment-related emails
├── payments/         # Payment and billing emails
├── users/           # User onboarding and account emails
│   ├── welcome-email.tsx         # Standard welcome email
│   └── welcome-email-i18n.tsx    # Internationalized welcome email
├── experts/         # Expert/provider notifications
├── notifications/   # General notification emails
├── utils/           # Email utilities and i18n system
│   ├── i18n.ts      # Internationalization utilities
│   └── novu-i18n.ts # Novu workflow integration with i18n
├── index.ts         # Main exports with i18n support
└── README.md        # This file
```

## 🎨 Design System

All templates now follow the **Eleva Care Design System** with consistent:

### Colors & Themes

#### Light Theme (Default)

- **Primary Teal**: `#006D77` - Main brand color for headings, buttons, and accents
- **Secondary Light**: `#F0FDFF` - Light teal background for information sections
- **Neutral Dark**: `#4A5568` - Body text color
- **Neutral Light**: `#718096` - Secondary text and muted content
- **Success Green**: `#22C55E` - Success messages and confirmations
- **Warning Yellow**: `#F59E0B` - Warning messages and alerts
- **Error Red**: `#EF4444` - Error messages and urgent alerts

#### Dark Theme

- **Primary Teal**: `#00A8B8` - Enhanced contrast for dark backgrounds
- **Secondary Dark**: `#1A2F33` - Dark teal background sections
- **Light Text**: `#F7FAFC` - Primary text color
- **Muted Light**: `#A0AEC0` - Secondary text color
- **Dark Surface**: `#1E2832` - Background surfaces
- **Dark Background**: `#0F1419` - Main background

### Typography

- **Font Family**: `system-ui, -apple-system, sans-serif` for optimal cross-platform rendering
- **Headings**: 24-28px, weight 600, Eleva Care teal (#006D77)
- **Body Text**: 16px, line-height 1.6, neutral dark (#4A5568)
- **Secondary Text**: 14px, neutral light (#718096)

### Components

All templates use standardized shared components:

- **EmailLayout**: Provides consistent header/footer wrapper
- **EmailButton**: Branded buttons with multiple variants (primary, outline, danger)
- **EmailHeader**: Multi-variant header with logo and navigation options
- **EmailFooter**: Legal-compliant footer with contact info and links

## 🚀 Usage

### Template Structure

All templates follow this standardized pattern:

```tsx
import { EmailButton, EmailLayout } from '@/components/emails';
import { Heading, Section, Text } from '@react-email/components';

export default function TemplateEmail(props) {
  const subject = "Email Subject";
  const previewText = "Preview text for inbox";

  return (
    <EmailLayout
      subject={subject}
      previewText={previewText}
      headerVariant="default"
      footerVariant="default"
    >
      <Heading style={{ color: '#006D77', fontSize: '28px', ... }}>
        Template Title
      </Heading>

      <Text style={{ color: '#4A5568', fontSize: '16px', ... }}>
        Email content
      </Text>

      <EmailButton href="/action" variant="primary" size="lg">
        Action Button
      </EmailButton>
    </EmailLayout>
  );
}
```

### Available Templates

#### Appointments

- **appointment-confirmation**: Confirms scheduled appointments with meeting details
- **appointment-reminder**: Reminds patients of upcoming appointments

#### Payments

- **payment-confirmation**: Confirms successful payment processing
- **multibanco-booking-pending**: Notifies about pending Multibanco payments
- **multibanco-payment-reminder**: Urgent reminders for expiring payments

#### Users

- **welcome-email**: Standard onboarding email for new users
- **welcome-email-i18n**: Internationalized welcome email with full i18n support

#### Experts

- **expert-notification**: Notifies healthcare providers of new requests

#### Notifications

- **notification-email**: Generic notification template for various use cases

### Internationalized Templates

All templates can be used with i18n support. The `*-i18n.tsx` versions provide:

- **Automatic locale detection** from user preferences, headers, or country codes
- **Theme-aware rendering** with light/dark mode support
- **Fallback content** when translations are missing
- **Message interpolation** with variables (e.g., `{userName}`, `{amount}`)
- **RTL support** for future Arabic/Hebrew locales

Example i18n template usage:

```tsx
import { createEmailContext, createWelcomeEmailI18n } from '@/emails';

// Create email with specific locale and theme
const emailContext = await createEmailContext('pt', 'dark');
const emailComponent = await createWelcomeEmailI18n({
  userName: 'Maria Silva',
  firstName: 'Maria',
  locale: 'pt',
  theme: 'dark',
  emailContext,
});
```

## 🛠️ Development

### Prerequisites

```bash
pnpm install @react-email/components
```

### Local Development

Run the React Email preview server:

```bash
pnpm email dev
```

Then visit `http://localhost:3000` to preview templates.

### Creating New Templates

1. **Choose the appropriate topic folder** (appointments, payments, users, etc.)
2. **Use the EmailLayout wrapper** for consistent header/footer
3. **Follow the design system colors and typography**
4. **Include TypeScript interfaces** for props
5. **Add PreviewProps** for development preview
6. **Export from topic index file**

Example new template:

```tsx
// emails/appointments/new-template.tsx
import { EmailButton, EmailLayout } from '@/components/emails';
import { Heading, Text } from '@react-email/components';

interface NewTemplateProps {
  userName: string;
  // ... other props
}

export default function NewTemplate({ userName }: NewTemplateProps) {
  return (
    <EmailLayout
      subject="New Template"
      previewText="Preview text"
      headerVariant="default"
      footerVariant="default"
    >
      <Heading style={{ color: '#006D77', fontSize: '28px' }}>Hello {userName}</Heading>
      {/* Template content */}
    </EmailLayout>
  );
}

NewTemplate.PreviewProps = {
  userName: 'John Doe',
} as NewTemplateProps;
```

## 🎯 Best Practices

### Accessibility & Compliance

- **High contrast ratios** following WCAG 2.1 guidelines
- **Semantic HTML structure** with proper heading hierarchy
- **Screen reader friendly** with appropriate alt text and ARIA labels
- **Mobile responsive** design with proper viewport meta tags
- **Email client compatibility** tested across major providers

### Content Guidelines

- **Clear subject lines** that indicate email purpose
- **Descriptive preview text** for inbox scanning
- **Action-oriented CTAs** with specific button text
- **Personalization** using recipient names and context
- **Professional tone** aligned with healthcare standards

### Technical Standards

- **TypeScript interfaces** for all props
- **Consistent error handling** for missing props
- **Preview props** for development testing
- **Proper imports** from shared components
- **Inline styles** for email client compatibility

## 🔧 Integration

Templates are integrated with the application through:

- **`lib/email.ts`**: Central email generation functions
- **Resend API**: Email delivery service
- **Booking flows**: Appointment confirmations and reminders
- **Payment webhooks**: Payment status notifications
- **User onboarding**: Welcome and notification emails

All templates automatically work with existing integrations through the centralized email generation system.

## 📱 Testing

Test templates using:

- **React Email preview**: Local development server
- **Cross-client testing**: Gmail, Outlook, Apple Mail, etc.
- **Mobile testing**: iOS Mail, Android Gmail
- **Accessibility testing**: Screen readers and keyboard navigation

The standardized EmailLayout ensures consistent rendering across all email clients and devices.
