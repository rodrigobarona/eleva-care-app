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
