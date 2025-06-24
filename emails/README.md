# Email Templates

This directory contains email templates for the Eleva Care application using [React Email](https://react.email/).

## Available Templates

- **Welcome Email** (`welcome-email.tsx`) - Welcome email for new users
- **Notification Email** (`notification-email.tsx`) - Generic notification template
- **Index exports** (`index.tsx`) - Exports for programmatic usage

## Preview Templates

To preview all email templates in your browser, run:

```bash
pnpm email:preview
```

This will start the React Email preview server at `http://localhost:3001`.

## Development Commands

```bash
# Start React Email preview server (recommended)
pnpm email:preview

# Alternative: Start with default settings
pnpm email:dev

# Export templates to HTML files
pnpm email:export
```

## Template Structure

Each template should:

1. Export a default React component
2. Include `PreviewProps` static property for preview data
3. Use `@react-email/components` for cross-client compatibility
4. Follow the established design patterns

### Example Template

```tsx
import { Body, Container, Head, Html, Text } from '@react-email/components';

export default function MyEmail({ name = 'User' }) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Text>Hello {name}!</Text>
        </Container>
      </Body>
    </Html>
  );
}

// Preview props for React Email preview server
MyEmail.PreviewProps = {
  name: 'John Doe',
};
```

## Using Templates in Code

```tsx
import WelcomeEmail from '@/emails/welcome-email';
import { render } from '@react-email/render';

// Render to HTML
const html = await render(<WelcomeEmail userName="John" />);

// Send with your email service
await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to Eleva Care',
  html,
});
```

## Best Practices

- Use inline styles or `@react-email/components` styling
- Test across multiple email clients
- Keep templates responsive and accessible
- Use semantic HTML structure
- Include preview text with `<Preview>` component
