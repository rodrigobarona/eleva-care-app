# Expert Onboarding - Complete Guide

This document provides a comprehensive guide to the expert onboarding process in the ElevaCare platform, covering both the user experience and the technical implementation details.

## Overview

The expert onboarding flow is a structured, step-by-step process designed to guide healthcare professionals through setting up their profile on the ElevaCare platform. The flow ensures that all necessary information is collected, payment processing is configured, and identity verification is completed before an expert can start accepting appointments.

## Onboarding Flow Steps

The onboarding process consists of six sequential steps:

1. **Username** - Create a personalized URL for the expert's booking page
2. **Events** - Define the types of services the expert offers
3. **Schedule** - Set available days and times for appointments
4. **Profile** - Complete professional profile with bio and specialties
5. **Billing** - Connect a Stripe account to receive payments
6. **Identity** - Verify identity through Stripe Identity

### Step 1: Username

**Purpose:** Create a unique, memorable URL for the expert's booking page.

**User Experience:**

- Expert enters a desired username
- System validates in real-time:
  - Format (alphanumeric with dashes/underscores, 3-30 characters)
  - Availability (not already taken by another expert)
  - Reserved words (admin, support, etc. are not allowed)
- Visual feedback shows when username is valid and available
- Expert confirms and continues to next step

**Technical Implementation:**

- Client-side validation with regex pattern: `/^[a-zA-Z0-9_-]{3,30}$/`
- Real-time availability check via API call to `/api/check-username?username=value`
- Username is stored in the `users` table when confirmed

### Step 2: Events

**Purpose:** Define the services that clients can book.

**User Experience:**

- Expert creates event types with:
  - Name (e.g., "Initial Consultation", "Follow-up Session")
  - Description of what the service includes
  - Duration in minutes
  - Price and currency
  - Custom URL slug for direct booking links
- Multiple events can be created and managed
- Each event includes detailed form fields with validation

**Technical Implementation:**

- Events stored in the `events` table
- Form validation using Zod schema
- Slug availability check via `/api/events/check-slug`
- Dynamic form creation with the ability to manage multiple events

### Step 3: Schedule

**Purpose:** Define when the expert is available for appointments.

**User Experience:**

- Expert sets their weekly availability schedule
- Options for:
  - Business hours for each day of the week
  - Breaks or unavailable periods
  - Time zone configuration
- Schedule is used to display available booking slots to clients

**Technical Implementation:**

- Availability stored in the `availability` table
- Weekly recurring schedule with custom overrides
- Integration with Google Calendar (optional)
- Default buffer times between appointments

### Step 4: Profile

**Purpose:** Provide professional information for the expert's public profile.

**User Experience:**

- Expert completes:
  - Professional bio (rich text)
  - Areas of specialization (multiple selections)
  - Professional qualifications with institutions and years
  - Professional photo (optional)
- Content guidelines and character count limits provided

**Technical Implementation:**

- Profile data stored in the `users` table in JSON fields
- Rich text editor for bio using a simplified interface
- Dynamic field arrays for specialties and qualifications
- Form validation for required fields

### Step 5: Billing

**Purpose:** Connect payment processing to receive funds from bookings.

**User Experience:**

- Expert is guided to connect a Stripe account
- Options for:
  - Creating a new Stripe account
  - Connecting an existing account
- Status indicators show completion of Stripe requirements
- Information about platform fees and payment processing

**Technical Implementation:**

- Integration with Stripe Connect Express
- Creation of account links via the Stripe API
- Status checking through `/api/stripe/connect/status`
- Error handling for connection issues
- Automatic account creation for new users

### Step 6: Identity

**Purpose:** Verify the expert's identity for trust and security.

**User Experience:**

- Expert is guided through Stripe's identity verification process
- Requirements:
  - Government-issued photo ID upload
  - Selfie verification
  - Additional documentation as needed
- Status updates as verification progresses
- Option to complete later if needed

**Technical Implementation:**

- Integration with Stripe Identity
- Verification session creation via Stripe API
- Status polling via `/api/identity/status`
- Webhook handling for verification updates

## State Management

The entire onboarding process is managed through the `ExpertOnboardingProvider`, which provides:

- Current step tracking
- Completion status for each step
- Navigation between steps
- API integration for saving progress

Key functionality includes:

```typescript
// Available through useExpertOnboarding() hook
{
  currentStep: OnboardingStep;          // Current active step
  completedSteps: OnboardingStep[];     // Array of completed steps
  isComplete: boolean;                  // Whether all steps are complete
  profilePublished: boolean;            // Whether profile is public
  isLoading: boolean;                   // Loading state
  goToStep: (step: OnboardingStep) => void;              // Navigate to step
  markStepComplete: (step: OnboardingStep) => Promise<void>;  // Mark step complete
  publishProfile: () => Promise<void>;                   // Make profile public
  refreshStatus: () => Promise<void>;                    // Refresh from API
  getStepStatus: (step: OnboardingStep) => 'complete' | 'current' | 'upcoming';
}
```

## Navigation

The onboarding flow provides several navigation options:

1. **Linear progression** - Complete each step in sequence
2. **Overview page** - See all steps and current progress
3. **Direct step access** - Jump to any step from the overview
4. **Step skipping** - Some non-critical steps can be completed later

The `OnboardingStepNav` component provides a visual indicator of progress and allows navigation between steps.

## Technical Architecture

### Database Schema

Expert-specific data is stored across several tables:

1. **users** - Core expert profile information:

   - `username` - Unique expert URL
   - `expert_bio` - Professional biography
   - `expert_specialties` - JSON array of specialties
   - `expert_qualifications` - JSON array of qualifications
   - `is_expert_profile_published` - Whether profile is public
   - `stripe_connect_account_id` - ID for Stripe Connect
   - `stripe_identity_verification_id` - ID for identity verification
   - `expert_onboarding_status` - JSON object tracking completion

2. **events** - Service offerings:

   - `name` - Event name
   - `description` - Service details
   - `duration_in_minutes` - Length of service
   - `price` - Cost of service
   - `currency` - Payment currency
   - `slug` - Custom URL path
   - `clerk_user_id` - Linked expert

3. **availability** - Scheduling information:
   - Weekly recurring schedules
   - Custom overrides
   - Buffer settings

### API Endpoints

The onboarding process uses several API endpoints:

1. **Status Management**

   - `GET /api/expert/onboarding/status` - Get current status
   - `POST /api/expert/onboarding/update` - Update step completion

2. **Profile Management**

   - `GET /api/expert/profile` - Get expert profile
   - `POST /api/expert/profile` - Update expert profile
   - `GET /api/check-username` - Check username availability

3. **Event Management**

   - `GET /api/events` - List expert's events
   - `POST /api/events` - Create new event
   - `GET /api/events/check-slug` - Check event slug availability

4. **Payment Integration**

   - `GET /api/stripe/connect/status` - Check Stripe Connect status

5. **Identity Verification**
   - `GET /api/identity/status` - Check identity verification status
   - `POST /api/stripe/identity/start-verification` - Start verification process

### Third-Party Integrations

The onboarding process integrates with several third-party services:

1. **Stripe Connect** - For payment processing

   - Account creation and linking
   - Status checking
   - Requirements verification

2. **Stripe Identity** - For identity verification

   - Document upload and verification
   - Selfie matching
   - Status tracking

3. **Clerk** - For authentication
   - User management
   - Role-based access control

## User Experience Enhancements

The onboarding process includes several UX enhancements:

1. **Progress Tracking**

   - Visual step indicator
   - Completion status per step
   - Overview of all steps

2. **Animation**

   - `FadeInSection` component for smooth transitions
   - Loading indicators for async operations

3. **Error Handling**

   - Validation feedback in forms
   - Error messages for API failures
   - Recovery options for failed steps

4. **Responsive Design**
   - Mobile-friendly layout
   - Adaptive form components

## Running and Testing

### Database Migrations

To set up the necessary database schema:

```bash
npm run run-migrations
```

### Testing the Flow

A dedicated test script simulates the onboarding process:

```bash
npm run test-expert-onboarding
```

This script:

- Creates test users with different roles
- Simulates the onboarding process
- Validates the expected database state

## Future Enhancements

Planned improvements to the onboarding process:

1. **Email Notifications**

   - Welcome emails
   - Step completion reminders
   - Verification status updates

2. **Progressive Profile Building**

   - Partial progress saving
   - Draft mode for unpublished profiles

3. **Enhanced Validation**

   - Qualification verification
   - Expert review process

4. **Analytics**
   - Funnel tracking
   - Dropout analysis
   - Completion time metrics

## Troubleshooting

Common issues and solutions:

1. **Username validation issues**

   - Check for special characters or length constraints
   - Ensure username is not a reserved word

2. **Stripe Connect errors**

   - Verify API keys and environment variables
   - Check for incomplete Stripe account requirements
   - Ensure proper redirect URLs are configured

3. **Identity verification failures**
   - Ensure proper document quality and lighting
   - Check that documents match the expert's information
   - Verify webcam access for selfie verification

## Conclusion

The expert onboarding flow provides a comprehensive, step-by-step process for healthcare professionals to join the ElevaCare platform. The process ensures that all necessary information is collected, payment processing is configured, and identity verification is completed, creating a trusted environment for both experts and clients.
