# Novu Framework Workflows

This document describes the Novu Framework workflows configured for Eleva Care.

## Workflows

### 1. Welcome Workflow (`user-welcome`)

- **Purpose**: Onboard new users to the platform
- **Triggers**: User registration
- **Channels**: In-app + Email
- **Critical**: No

### 2. Payment Success Workflow (`payment-success`)

- **Purpose**: Confirm successful payments
- **Triggers**: Payment completion
- **Channels**: In-app + Email
- **Critical**: Yes

### 3. Payment Failed Workflow (`payment-failed`)

- **Purpose**: Alert users of failed payments
- **Triggers**: Payment failure
- **Channels**: In-app + Email
- **Critical**: Yes

### 4. Appointment Reminder Workflow (`appointment-reminder-24hr`)

- **Purpose**: 24-hour appointment reminders
- **Triggers**: Scheduled 24 hours before appointment
- **Channels**: In-app + Email
- **Critical**: Yes

### 5. Expert Onboarding Complete Workflow (`expert-onboarding-complete`)

- **Purpose**: Welcome experts when profile is approved
- **Triggers**: Expert profile approval
- **Channels**: In-app + Email
- **Critical**: Yes

### 6. Health Check Failure Workflow (`health-check-failure`)

- **Purpose**: Alert administrators of system health issues
- **Triggers**: Health check failure
- **Channels**: In-app + Email
- **Critical**: Yes

## Usage

### Triggering Workflows

```typescript
import { Novu } from '@novu/api';

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY,
});

// Trigger welcome workflow
await novu.trigger({
  workflowId: 'user-welcome',
  to: {
    subscriberId: 'user_123',
    firstName: 'John',
    email: 'john@example.com',
  },
  payload: {
    userName: 'John Doe',
    firstName: 'John',
    profileUrl: '/profile',
  },
});
```

### Workflow Deployment

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
    workflows.ts    # Main workflow definitions
    index.ts        # Export file
  novu.ts          # Configuration exports
app/
  api/
    novu/
      route.ts      # Next.js API route
```

## Environment Variables

Required environment variables:

- `NOVU_SECRET_KEY` - Your Novu secret key
- `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER` - Your application identifier

## Development

To test workflows locally:

1. Start your development server
2. Run Novu Studio: `npx novu@latest dev`
3. Test workflows in the Studio interface

## Production

Before deploying to production:

1. Ensure all environment variables are set
2. Sync workflows: `npm run sync:novu`
3. Configure email providers in Novu Dashboard
4. Set up webhook endpoints if needed
