# Testing Guidelines for Eleva Care App

This document outlines the testing strategy and standards for the Eleva Care App project.

## Testing Philosophy

Our testing approach follows these principles:

1. **Confidence over Coverage**: We prioritize writing tests that give us confidence the code works correctly, rather than aiming for arbitrary coverage percentages.
2. **Risk-Based Testing**: Focus testing efforts on high-risk areas like payment processing, data integrity, and user-facing features.
3. **FIRST Principles**: Tests should be Fast, Independent, Repeatable, Self-validating, and Timely.

## Testing Structure

We organize our tests in a way that mirrors the structure of our codebase:

- `/tests/server/` - Server-side tests, including server actions
- `/tests/api/` - API route tests
- `/tests/components/` - React component tests
- `/tests/lib/` - Utility function tests
- `/tests/integration/` - Cross-module integration tests

## Types of Tests

### 1. Unit Tests

These test individual functions and components in isolation. Examples:

- Pure utility functions in `/lib`
- Individual server actions in `/server/actions`
- Individual React components

### 2. Integration Tests

These test how multiple parts of the system work together. Examples:

- Testing a form component that interacts with a server action
- Testing API routes that interact with the database

### 3. End-to-End Tests (Future)

These test entire workflows from the user's perspective. To be implemented in the future.

## Mocking Strategy

- **External Dependencies**: Always mock external APIs (Stripe, Clerk, etc.)
- **Database Access**: Mock database calls to avoid test flakiness
- **Server Components**: When testing client components that use server components, use mock implementations

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (good for development)
npm run test:watch

# Run tests with coverage report
npm test -- --coverage
```

## Testing Checklist

When writing tests, consider:

- [ ] Have you tested the happy path?
- [ ] Have you tested error conditions?
- [ ] Have you tested edge cases?
- [ ] Are your tests independent of each other?
- [ ] Are your tests fast enough to run frequently?

## Adding New Tests

1. Create a new file with the `.test.ts` or `.test.tsx` extension
2. Import required testing utilities
3. Write descriptive test cases using `describe` and `it`
4. Use appropriate assertions with `expect`
5. Run tests to verify they pass

## Example Test Pattern

```typescript
import { describe, expect, it } from '@jest/globals';

describe('ComponentName or FunctionName', () => {
  describe('specific behavior or method', () => {
    it('should do something specific under certain conditions', () => {
      // Arrange - set up test data

      // Act - perform the action to be tested

      // Assert - check the results
      expect(result).toBe(expectedValue);
    });
  });
});
```

## Priority Testing Areas

Focus on testing these critical areas first:

1. Payment processing functions and API routes
2. Authentication and authorization logic
3. Booking and scheduling functionality
4. User data management
5. Key UI components that handle user interactions

## Continuous Integration

Tests run automatically on pull requests and before deployment to ensure code quality and prevent regressions.

## Current Test Implementation Status

As of March 2025, we have implemented the following tests:

### Working Tests

1. **Utility Function Tests**

   - `tests/lib/utils.test.ts` - Tests for the `cn` utility function
   - `tests/lib/stripe.test.ts` - Tests for the `calculateApplicationFee` function
   - `tests/lib/formatters.test.ts` - Tests for date and time formatting functions

2. **Server Action Tests**
   - `tests/server/actions/expert-profile.test.ts` - Tests for the expert profile publication toggle (8 test cases)

### Test Implementation Statistics

- **Total Number of Tests**: 46
- **Passing Tests**: 28 (61%)
- **Failing Tests**: 18 (39%)
- **Test Files Implemented**: 8
- **Test Files Passing**: 4 (50%)
- **Test Files Failing**: 4 (50%)

### Tests That Need Fixes

1. **Component Tests**
   - `tests/components/ProfilePublishToggle.test.tsx` - Missing React Testing Library dependencies
2. **Server Action Tests**

   - `tests/server/actions/stripe.test.ts` - Issues with mocking and importing the Stripe module
   - `tests/server/actions/meetings.test.ts` - Mismatches between expected and actual implementation behavior

3. **API Route Tests**
   - `tests/api/create-payment-intent.test.ts` - Issues with mocking complex dependencies and response handling

## Common Test Issues and Solutions

### 1. Missing Dependencies

When encountering module not found errors like `Cannot find module '@testing-library/react'`, you need to:

- Install the missing dependency with `npm install --save-dev @testing-library/react`
- If you encounter peer dependency conflicts with React 19, you may need to use `--legacy-peer-deps` flag

### 2. Mocking Complex Objects

For proper mocking:

- Define mocks BEFORE importing the modules that use them
- Use separate variables for mocks (e.g., `mockStripe` instead of direct jest.fn() calls)
- Ensure the structure of mocked objects matches what the code under test expects

### 3. Handling API Responses

For route handler tests:

- Mock the NextResponse.json method with a function that returns an object with data and status
- Ensure proper error handling is in place
- Set up all necessary request context like headers and cookies

### 4. Testing Server Actions

Server actions have complex dependencies:

- Mock database queries to avoid actual DB calls
- Mock authentication services like Clerk
- Setup realistic return values that match the actual implementation

## Next Steps for Testing

1. **Fix Existing Tests**

   - Resolve dependency issues with React Testing Library
   - Correct mocking approaches for Stripe and other external services
   - Align test expectations with actual implementation behavior

2. **Add More Unit Tests**

   - Focus on critical utility functions in `/lib`
   - Continue with server actions in `/server/actions`
   - Test form validations with schema validation

3. **Implement Integration Tests**

   - Create tests that cover critical user flows
   - Test API routes with realistic requests and responses

4. **Add End-to-End Tests**
   - Implement Playwright or Cypress tests for complete user journeys

## Test Implementation Checklist

This checklist tracks our progress implementing tests across the codebase. Mark items as completed (`[x]`) when tests are implemented and passing.

### Utility Functions

- [x] `tests/lib/utils.test.ts` - Test the `cn` utility function
- [x] `tests/lib/stripe.test.ts` - Test the `calculateApplicationFee` function
- [x] `tests/lib/formatters.test.ts` - Test date and currency formatting functions
- [ ] `tests/lib/encryption.test.ts` - Test encryption/decryption utilities
- [ ] `tests/lib/getValidTimesFromSchedule.test.ts` - Test availability calculation logic
- [ ] `tests/lib/logAuditEvent.test.ts` - Test audit logging functionality

### Server Actions

#### Payment & Billing

- [x] `tests/server/actions/stripe.test.ts` - Test Stripe customer and payment method operations
- [ ] `tests/server/actions/billing.test.ts` - Test billing operations
- [ ] `tests/server/actions/user-sync.test.ts` - Test user data synchronization with payment providers

#### Booking & Scheduling

- [x] `tests/server/actions/meetings.test.ts` - Test meeting creation and management
- [ ] `tests/server/actions/events.test.ts` - Test event creation and management
- [ ] `tests/server/actions/schedule.test.ts` - Test schedule management operations

#### User Management

- [x] `tests/server/actions/expert-profile.test.ts` - Test expert profile publication toggle
- [ ] `tests/server/actions/expert-setup.test.ts` - Test expert onboarding
- [ ] `tests/server/actions/profile.test.ts` - Test general profile operations
- [ ] `tests/server/actions/experts.test.ts` - Test expert listing and search operations

### API Routes

#### Payments & Webhooks

- [x] `tests/api/create-payment-intent.test.ts` - Test payment intent creation
- [ ] `tests/api/webhooks/stripe.test.ts` - Test Stripe webhook handling
- [ ] `tests/api/webhooks/stripe-identity.test.ts` - Test Stripe identity verification webhook

#### User & Data Management

- [ ] `tests/api/users.test.ts` - Test user data API endpoints
- [ ] `tests/api/profile.test.ts` - Test profile API endpoints
- [ ] `tests/api/experts.test.ts` - Test expert listing API endpoints
- [ ] `tests/api/categories.test.ts` - Test category management endpoints

#### Booking & Scheduling

- [ ] `tests/api/meetings.test.ts` - Test meeting API endpoints
- [ ] `tests/api/appointments.test.ts` - Test appointment management endpoints
- [ ] `tests/api/records.test.ts` - Test record management endpoints

### React Components

#### Forms & Input Components

- [x] `tests/components/ProfilePublishToggle.test.tsx` - Test profile publication toggle
- [ ] `tests/components/forms/EventForm.test.tsx` - Test event creation form
- [ ] `tests/components/forms/ProfileForm.test.tsx` - Test profile editing form
- [ ] `tests/components/forms/ScheduleForm.test.tsx` - Test schedule management form

#### Layout & Page Components

- [ ] `tests/components/organisms/BookingLayout.test.tsx` - Test booking page layout
- [ ] `tests/components/organisms/EventsList.test.tsx` - Test events listing component
- [ ] `tests/components/organisms/ExpertSetupChecklist.test.tsx` - Test expert setup UI
- [ ] `tests/components/organisms/Header.test.tsx` - Test header/navigation component
- [ ] `tests/components/organisms/Footer.test.tsx` - Test footer component

#### Interactive Components

- [ ] `tests/components/organisms/AppointmentCard.test.tsx` - Test appointment display
- [ ] `tests/components/organisms/RecordDialog.test.tsx` - Test recording dialog
- [ ] `tests/components/admin/UserManagement.test.tsx` - Test admin user management UI

### Integration Tests

- [ ] `tests/integration/booking-flow.test.ts` - Test end-to-end booking process
- [ ] `tests/integration/payment-flow.test.ts` - Test end-to-end payment process
- [ ] `tests/integration/expert-onboarding.test.ts` - Test expert signup and profile setup
- [ ] `tests/integration/availability-selection.test.ts` - Test scheduling and time selection

## Maintaining This Checklist

When adding new tests:

1. Add a new entry to the appropriate section above
2. Start with `[ ]` to indicate the test needs to be implemented
3. Mark as `[-]` when test file is created but not yet verified as passing
4. Update to `[x]` when the test is completed and passing
5. Add details about what aspects are tested

When refactoring or adding new features:

1. Add new test entries for the new functionality
2. Review existing tests to ensure they still cover relevant functionality

Progress tracking:

- Total tests planned: 35
- Tests implemented: 8
- Tests in progress: 0
- Completion percentage: 22.9%

## Test Implementation Progress

**35 tests total | 8 implemented | 0 in progress | 22.9% complete**

Tracking of test implementation progress:

### Library / Utility Functions

- [x] `tests/lib/utils.test.ts`
- [x] `tests/lib/stripe.test.ts`
- [x] `tests/lib/formatters.test.ts`
- [ ] `tests/lib/validations.test.ts`
- [ ] `tests/lib/config.test.ts`
- [ ] `tests/lib/date-utils.test.ts`
- [ ] `tests/lib/db-utils.test.ts`

### Server Actions

- [x] `tests/server/actions/expert-profile.test.ts`
- [x] `tests/server/actions/meetings.test.ts`
- [x] `tests/server/actions/stripe.test.ts`
- [ ] `tests/server/actions/user-preferences.test.ts`
- [ ] `tests/server/actions/booking.test.ts`
- [ ] `tests/server/actions/availability.test.ts`
- [ ] `tests/server/actions/search.test.ts`
- [ ] `tests/server/actions/reviews.test.ts`
- [ ] `tests/server/actions/notifications.test.ts`

### API Routes

- [ ] `tests/api/stripe-webhooks.test.ts`
- [x] `tests/api/create-payment-intent.test.ts`
- [ ] `tests/api/create-checkout-session.test.ts`
- [ ] `tests/api/availability.test.ts`
- [ ] `tests/api/stripe-identity.test.ts`
- [ ] `tests/api/clerk-webhooks.test.ts`

### React Components

- [x] `tests/components/ProfilePublishToggle.test.tsx`
- [ ] `tests/components/Calendar.test.tsx`
- [ ] `tests/components/BookingForm.test.tsx`
- [ ] `tests/components/ExpertCard.test.tsx`
- [ ] `tests/components/PaymentSummary.test.tsx`
- [ ] `tests/components/AvailabilityPicker.test.tsx`
- [ ] `tests/components/SearchFilters.test.tsx`
- [ ] `tests/components/ProfileEditor.test.tsx`
- [ ] `tests/components/ReviewForm.test.tsx`
- [ ] `tests/components/MeetingsList.test.tsx`
- [ ] `tests/components/Notifications.test.tsx`
- [ ] `tests/components/AuthForms.test.tsx`
- [ ] `tests/components/Modals.test.tsx`

**Note**: Tests marked with [x] are complete, [-] are in progress, and [ ] are not yet implemented.

## Testing Complex Server Actions with External Dependencies

### Lessons from Expert Profile Testing

The implementation of `tests/server/actions/expert-profile.test.ts` provided several valuable lessons for testing server actions with complex dependencies:

1. **Mocking Module Exports**: When mocking modules with named exports (like Clerk), we need to ensure that the mock factory returns an object with the same structure as the real module, with functions that can be called in the same way.

2. **Dependencies First**: Always define all mock implementations and jest.mock() calls before importing the module under test.

3. **Controlled Mock Return Values**: Create dedicated mock functions for each dependency and control their return values in each test case to simulate different scenarios.

4. **Complete Mock Coverage**: Ensure every external dependency (database, authentication, etc.) is properly mocked to prevent real API calls during testing.

5. **Chainable Mock Methods**: For fluent APIs like Drizzle's query builder, create chainable mock functions to accurately simulate the API's behavior.

6. **Error Simulation**: Test error handling by explicitly throwing errors from mocks in specific test cases.

7. **State Verification**: After calling the function under test, verify the state changes by checking if the right mock functions were called with the expected parameters.

This approach can be applied to other server actions with similar dependencies throughout the application.

## Current Implementation Status

### Working Tests

- [x] ProfilePublishToggle tests
- [x] MeetingForm tests

### Implementation Stats

- 2 / 35 (5.7%) of planned test files have been implemented.
- 1 / 3 (33.3%) of critical flow tests have been implemented.
- Approximately 22.9% of tests on the checklist have been implemented.

## Recent Updates

- **All tests now passing**: Fixed all 71 tests across 11 test suites
- **No skipped tests**: Implemented proper error handling tests that were previously skipped
- **Added MeetingForm component test**: Comprehensive validation of the booking flow
- **Improved mock implementations**: Enhanced mock setup for Clerk API and database interactions
- **TextEncoder/TextDecoder polyfills**: Added necessary polyfills in tests/setup.ts
- **Consistent error handling**: Standardized approach to testing error conditions

## Test Status

- **Critical Flow Tests**: 1 of 3 implemented (booking flow)
- **Test Checklist Completion**: ~23% of tests on the checklist are implemented
