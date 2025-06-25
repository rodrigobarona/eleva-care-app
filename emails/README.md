# Eleva Care Email Templates

Centralized, organized email templates using React Email and shared components for consistent branding and user experience.

## 📁 Structure

```
emails/
├── appointments/           # Appointment-related emails
│   ├── appointment-confirmation.tsx
│   └── appointment-reminder.tsx
├── payments/              # Payment and billing emails
│   ├── payment-confirmation.tsx
│   ├── multibanco-booking-pending.tsx
│   └── multibanco-payment-reminder.tsx
├── users/                 # User lifecycle emails
│   └── welcome-email.tsx
├── experts/               # Expert/provider emails
│   └── expert-notification.tsx
├── notifications/         # General notification emails
│   └── notification-email.tsx
└── README.md             # This file

components/emails/         # Shared email components
├── EmailLayout.tsx        # Base layout wrapper
├── EmailHeader.tsx        # Consistent header
├── EmailFooter.tsx        # Legal-compliant footer
├── EmailButton.tsx        # Branded buttons
└── index.ts              # Component exports
```

## 🧩 Shared Components

All email templates use shared components from `@/components/emails` for consistency:

### EmailLayout

Base wrapper providing:

- Consistent HTML structure
- Header/footer integration
- Mobile responsiveness
- Email client compatibility
- Accessibility features

### EmailHeader

- Eleva Care branding
- Multiple variants (default, minimal, branded)
- Theme support (light/dark)
- Navigation options

### EmailFooter

- Legal compliance (privacy, terms)
- Unsubscribe functionality
- Contact information
- Multi-language support

### EmailButton

- Consistent styling
- Multiple variants (primary, secondary, outline, danger)
- Size options (sm, md, lg)
- Accessibility compliant

## 🚀 Usage

### Basic Template Structure

```tsx
import { EmailButton, EmailLayout } from '@/components/emails';
import { Heading, Section, Text } from '@react-email/components';

export default function MyEmailTemplate({ name = 'User' }) {
  return (
    <EmailLayout
      subject="Welcome to Eleva Care"
      previewText="Start your health journey with us"
      headerVariant="default"
      footerVariant="default"
    >
      <Heading style={{ color: '#006D77', fontSize: '24px' }}>Hello {name}!</Heading>

      <Text style={{ color: '#4a5568', fontSize: '16px' }}>Welcome to our platform...</Text>

      <EmailButton href="https://eleva.care/dashboard" variant="primary">
        Get Started
      </EmailButton>
    </EmailLayout>
  );
}
```

### Email Generation (lib/email.ts)

```tsx
// Generate appointment confirmation
const { html, text, subject } = await generateAppointmentEmail({
  expertName: 'Dr. Maria Santos',
  clientName: 'João Silva',
  appointmentDate: '2024-02-15',
  appointmentTime: '10:00',
  timezone: 'Europe/Lisbon',
  // ... other params
});

await sendEmail({
  to: 'patient@example.com',
  subject,
  html,
  text,
});
```

## 🎨 Design System

### Colors

- **Primary**: `#006D77` (Eleva Care teal)
- **Secondary**: `#F0FDFF` (Light teal)
- **Text**: `#4a5568` (Dark gray)
- **Muted**: `#718096` (Medium gray)
- **Success**: `#28a745` (Green)
- **Warning**: `#ffc107` (Yellow)
- **Danger**: `#dc3545` (Red)

### Typography

- **Font Family**: `system-ui, -apple-system, sans-serif`
- **Headings**: 24px-28px, semi-bold
- **Body**: 16px, regular
- **Small**: 14px, regular
- **Fine Print**: 12px, regular

### Spacing

- **Small**: 8px
- **Medium**: 16px
- **Large**: 24px
- **XL**: 32px

## 📧 Email Types

### Appointments

- **Confirmation**: Appointment details with video call link
- **Reminder**: Pre-appointment reminder with preparation checklist

### Payments

- **Confirmation**: Payment receipt with transaction details
- **Multibanco Pending**: Payment instructions for Portuguese users
- **Multibanco Reminder**: Urgent payment reminders

### Users

- **Welcome**: Onboarding email with next steps

### Experts

- **Notifications**: Updates and alerts for healthcare providers

### Notifications

- **General**: System notifications and updates

## 🔧 Development

### Local Preview

```bash
# Start React Email preview server
pnpm email dev

# View at http://localhost:3000
```

### Testing

```bash
# Test email generation
pnpm test:email

# Send test emails
node scripts/test-emails.js
```

### Adding New Templates

1. **Create template** in appropriate topic folder
2. **Use shared components** from `@/components/emails`
3. **Add generation function** to `lib/email.ts`
4. **Update imports** if needed
5. **Test with React Email preview**

### Best Practices

- **Always use EmailLayout** as the base wrapper
- **Consistent styling** with design system colors/fonts
- **Mobile-first** responsive design
- **Accessibility** - proper heading structure, alt text, color contrast
- **Email client compatibility** - tested across major clients
- **Localization ready** - support for multiple languages

## 🌍 Internationalization

Templates support multiple locales through:

- Dynamic subject generation
- Locale-aware date/time formatting
- Currency formatting
- RTL language support (future)

## 📋 Migration Notes

This organized structure replaces the previous scattered email system:

- ✅ Consolidated from multiple directories
- ✅ Eliminated duplication
- ✅ Shared component architecture
- ✅ Topic-based organization
- ✅ React Email best practices

## 🔗 Integration

Templates integrate with:

- **Resend** for email delivery
- **Novu** for workflow automation (development)
- **Next.js i18n** for translations
- **Stripe** for payment receipts
- **Google Calendar** for appointments

---

For questions or contributions, contact the development team.
