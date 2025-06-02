# Multilingual Novu Framework Workflows

This document describes the multilingual Novu Framework workflows configured for Eleva Care using next-intl.

## Supported Languages

- **English (en)**: Primary language
- **Portuguese (pt)**: Portugal Portuguese
- **Spanish (es)**: Spanish
- **Brazilian Portuguese (br)**: Brazilian Portuguese

## Workflow Structure

Each workflow is created for every supported language with locale-specific IDs:

### 1. Welcome Workflow (`user-welcome-{locale}`)

- **Purpose**: Onboard new users to the platform
- **Triggers**: User registration
- **Channels**: In-app + Email
- **Locales**: `en`, `pt`, `es`, `br`

### 2. Payment Success Workflow (`payment-success-{locale}`)

- **Purpose**: Confirm successful payments
- **Triggers**: Payment completion
- **Channels**: In-app + Email
- **Locales**: `en`, `pt`, `es`, `br`

### 3. Payment Failed Workflow (`payment-failed-{locale}`)

- **Purpose**: Alert users of failed payments
- **Triggers**: Payment failure
- **Channels**: In-app + Email
- **Locales**: `en`, `pt`, `es`, `br`

### 4. Appointment Reminder Workflow (`appointment-reminder-24hr-{locale}`)

- **Purpose**: 24-hour appointment reminders
- **Triggers**: Scheduled 24 hours before appointment
- **Channels**: In-app + Email
- **Locales**: `en`, `pt`, `es`, `br`

### 5. Expert Onboarding Complete Workflow (`expert-onboarding-complete-{locale}`)

- **Purpose**: Welcome experts when profile is approved
- **Triggers**: Expert profile approval
- **Channels**: In-app + Email
- **Locales**: `en`, `pt`, `es`, `br`

### 6. Health Check Failure Workflow (`health-check-failure-{locale}`)

- **Purpose**: Alert administrators of system health issues
- **Triggers**: Health check failure
- **Channels**: In-app + Email
- **Locales**: `en`, `pt`, `es`, `br`

## Usage

### Triggering Localized Workflows

```typescript
import { getLocalizedWorkflowId } from '@/config/novu';
import { Novu } from '@novu/api';

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY,
});

// Trigger welcome workflow for Portuguese user
await novu.trigger({
  workflowId: getLocalizedWorkflowId('user-welcome', 'pt'),
  to: {
    subscriberId: 'user_123',
    firstName: 'João',
    email: 'joao@example.com',
  },
  payload: {
    userName: 'João Silva',
    firstName: 'João',
    profileUrl: '/profile',
  },
});
```

### Getting Workflows by Locale

```typescript
import { getWorkflowsForLocale } from '@/config/novu';

// Get all Portuguese workflows
const ptWorkflows = getWorkflowsForLocale('pt');

// Get workflows with fallback to English
const userWorkflows = getWorkflowsForLocale(userLocale);
```

## Translation System

The workflows use translations from the `messages/` directory:

```
messages/
  ├── en.json     # English (primary)
  ├── pt.json     # Portuguese (Portugal)
  ├── es.json     # Spanish
  └── br.json     # Brazilian Portuguese
```

### Translation Structure

```json
{
  "notifications": {
    "welcome": {
      "subject": "Welcome to Eleva Care, {userName}!",
      "body": "Hi {userName}! Welcome to Eleva Care...",
      "email": {
        "subject": "Welcome to Eleva Care!",
        "title": "Welcome to Eleva Care!",
        "greeting": "Hi {firstName},",
        "body": "Thank you for joining our healthcare platform...",
        "nextStepsTitle": "Next Steps:",
        "nextSteps": [
          "Complete your profile",
          "Browse available experts",
          "Book your first consultation"
        ],
        "cta": "Complete Your Profile"
      }
    }
  }
}
```

## Workflow Deployment

The workflows are automatically deployed when you sync with Novu Cloud:

```bash
npx novu@latest sync \
  --bridge-url https://your-domain.com/api/novu \
  --secret-key YOUR_NOVU_SECRET_KEY
```

## File Structure

```
config/
  novu/
    workflows.ts    # Multilingual workflow definitions
    index.ts        # Export file
  novu.ts          # Configuration exports
app/
  api/
    novu/
      route.ts      # Next.js API route
messages/            # Translation files
  en.json
  pt.json
  es.json
  br.json
```

## Development

To test workflows locally:

1. Start your development server
2. Run Novu Studio: `npx novu@latest dev`
3. Test workflows in the Studio interface
4. Workflows will be available with locale suffixes

## Adding New Languages

1. Create new translation file in `messages/{locale}.json`
2. Add locale to `supportedLocales` array in setup script
3. Run setup script: `npm run setup:novu-workflows`
4. Sync workflows: `npm run sync:novu`

## Production

Before deploying to production:

1. Ensure all translation files are complete
2. Set environment variables for all locales
3. Sync workflows: `npm run sync:novu`
4. Configure email providers in Novu Dashboard
5. Test with different locale users
