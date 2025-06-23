# Email Content Templates

This directory contains extracted email content templates for better organization and maintainability.

## Structure

```
content/
├── types.ts          # TypeScript type definitions
├── welcome.ts        # Welcome email template
├── expert.ts         # Expert consultation request template
├── appointment.ts    # Appointment reminder template
├── payment.ts        # Payment confirmation template
├── index.ts          # Central export file
└── README.md         # This file
```

## Usage

The templates are automatically imported and used by the test email API route:

```typescript
import { emailTemplates } from '@/lib/email-templates/content';

// Access any template
const template = emailTemplates.welcome;
const subject = template.subject.en; // "Welcome to Eleva Care - Your Health Journey Begins"
```

## Adding New Templates

1. **Create the template file** (e.g., `reminder.ts`):

```typescript
import type { EmailContentType } from './types';

export const reminderTemplate: EmailContentType = {
  subject: {
    en: 'Reminder: Your appointment is tomorrow',
    es: 'Recordatorio: Tu cita es mañana',
    pt: 'Lembrete: A sua consulta é amanhã',
    br: 'Lembrete: Sua consulta é amanhã',
  },
  preheader: {
    en: "Don't forget about your upcoming consultation",
    es: 'No olvides tu próxima consulta',
    pt: 'Não se esqueça da sua próxima consulta',
    br: 'Não esqueça da sua próxima consulta',
  },
  body: {
    en: '<div>Your appointment HTML content here...</div>',
    es: '<div>Contenido HTML de tu cita aquí...</div>',
    pt: '<div>Conteúdo HTML da sua consulta aqui...</div>',
    br: '<div>Conteúdo HTML da sua consulta aqui...</div>',
  },
};
```

2. **Export it in index.ts**:

```typescript
export { reminderTemplate } from './reminder';

export const emailTemplates: Record<string, EmailContentType> = {
  welcome: welcomeTemplate,
  expert: expertTemplate,
  appointment: appointmentTemplate,
  payment: paymentTemplate,
  reminder: reminderTemplate, // Add your new template
};
```

3. **Use it in the API route**:

```typescript
// The template will be automatically available via:
const content = emailTemplates.reminder;
```

## Localization

All templates support four locales:

- `en` - English
- `es` - Spanish
- `pt` - Portuguese (Portugal)
- `br` - Portuguese (Brazil)

Each template must include translations for all locales.

## HTML Content Guidelines

- Use inline styles for email compatibility
- Keep the HTML simple and email-client friendly
- Test with different email clients
- All HTML content is automatically sanitized for security

## Benefits of This Structure

- **Maintainability**: Each template is in its own file
- **Type Safety**: Full TypeScript support
- **Reusability**: Templates can be imported anywhere
- **Scalability**: Easy to add new templates
- **Organization**: Clear separation of concerns
- **Security**: Automatic HTML sanitization
