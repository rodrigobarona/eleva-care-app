# Expert Onboarding Implementation

This document outlines the expert onboarding flow for the ElevaCare application, including implementation details, architecture decisions, and testing strategies.

## Overview

The expert onboarding flow is a multi-step process that guides new experts through setting up their profile on the ElevaCare platform. The flow includes steps for creating a username, defining events, setting availability, completing profile information, connecting payment methods, and verifying identity.

## Architecture

### Database Schema

Expert-specific fields are stored in the `users` table:

```sql
ALTER TABLE users
ADD COLUMN username TEXT UNIQUE,
ADD COLUMN expert_bio TEXT,
ADD COLUMN expert_specialties JSONB DEFAULT '[]',
ADD COLUMN expert_qualifications JSONB DEFAULT '[]',
ADD COLUMN is_expert_profile_published BOOLEAN DEFAULT FALSE,
ADD COLUMN stripe_connect_account_id TEXT,
ADD COLUMN stripe_identity_verification_id TEXT;
```

Onboarding progress tracking is stored in:

```sql
CREATE TABLE expert_onboarding_status (
  id SERIAL PRIMARY KEY,
  clerk_user_id TEXT NOT NULL REFERENCES users(clerk_user_id) ON DELETE CASCADE,
  steps_completed JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### State Management

Onboarding state is managed through the `ExpertOnboardingProvider`, which provides:

- Current status of each onboarding step
- Functions to mark steps as complete
- Function to refresh status from the API

### API Routes

The following API routes manage the onboarding process:

- `/api/expert/onboarding/status` - GET: Fetch the current onboarding status
- `/api/expert/onboarding/update` - POST: Update completion status of steps
- `/api/events` - GET/POST: Manage expert event types
- `/api/identity/status` - GET: Check identity verification status
- `/api/stripe/connect/status` - GET: Check Stripe Connect account status
- `/api/expert/profile` - GET/POST: Manage expert profile data
- `/api/events/check-slug` - GET: Check availability of custom event URLs

### Onboarding Steps

1. **Username**

   - Purpose: Create a unique username for the expert's booking URL
   - Implementation: Real-time validation and availability checking
   - Files: `app/expert-onboarding/username/page.tsx`

2. **Events**

   - Purpose: Create event types that clients can book
   - Implementation: Form for creating and managing event types
   - Files: `app/expert-onboarding/events/page.tsx`, `components/organisms/forms/EventForm.tsx`

3. **Schedule**

   - Purpose: Set availability for bookings
   - Implementation: Weekly schedule interface
   - Files: `app/expert-onboarding/schedule/page.tsx`

4. **Profile**

   - Purpose: Collect expert bio, specialties, and qualifications
   - Implementation: Form with dynamic fields for specialties and qualifications
   - Files: `app/expert-onboarding/profile/page.tsx`

5. **Billing**

   - Purpose: Connect Stripe for payments
   - Implementation: Connect to Stripe Express Connect
   - Files: `app/expert-onboarding/billing/page.tsx`

6. **Identity**
   - Purpose: Verify expert identity
   - Implementation: Integration with Stripe Identity
   - Files: `app/expert-onboarding/identity/page.tsx`

### Access Control

Middleware ensures that:

1. Only authenticated users can access the onboarding flow
2. Only users with expert roles can access the onboarding flow
3. Experts must complete onboarding before accessing expert features

## Running the Implementation

### 1. Run Database Migrations

Execute the following command to run the required migrations:

```bash
npm run run-migrations
```

This will apply all the database changes needed for the expert onboarding flow.

### 2. Environment Variables

Ensure the following environment variables are set:

```
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Testing the Flow

For testing with different user roles, run:

```bash
npm run test-expert-onboarding
```

This script will create test users with different roles and simulate the onboarding process.

## Implementation Notes

### Form Validation

- All forms use Zod for validation
- Validation happens both client-side and server-side
- Interactive feedback is provided for required fields

### Error Handling

- API routes have comprehensive error handling with specific status codes
- Forms display server errors in user-friendly alerts
- Network errors are caught and displayed to the user

### Animation

- Page transitions use the `FadeInSection` component for smooth animations
- Loading states are displayed during async operations

## Third-Party Integrations

### Stripe Connect

Used for setting up payment processing for experts:

- Account creation
- Account verification
- Account link generation

### Stripe Identity

Used for identity verification:

- Document verification
- Selfie verification
- Status tracking

## Future Improvements

1. **Two-factor authentication** for extra security during onboarding
2. **Document upload** for additional qualifications verification
3. **Preview mode** to see how profile appears to clients
4. **Email notifications** for onboarding steps completed/pending

## Troubleshooting

### Common Issues

1. **Database migrations failing**

   - Ensure your connection string is correct
   - Check if you have the necessary permissions
   - Look for conflicting migrations

2. **Stripe integration issues**

   - Verify your API keys are correct
   - Check webhooks are properly configured
   - Ensure your account is properly set up for Connect and Identity

3. **Form validation errors**
   - Check browser console for any JavaScript errors
   - Verify that the form schema matches the API expectations
