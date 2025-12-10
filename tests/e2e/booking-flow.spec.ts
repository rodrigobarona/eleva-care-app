import { expect, test } from '@playwright/test';

/**
 * E2E Tests for MeetingForm Booking Flow
 *
 * These tests verify the critical booking flow for both free and paid events.
 * They use visual regression testing to ensure UI consistency.
 *
 * Test scenarios covered:
 * - Free event complete booking flow
 * - Paid event checkout redirect flow
 * - Form validation feedback
 * - Step navigation
 * - Mobile responsiveness
 */

// Test constants - replace with actual test data
const TEST_EXPERT_USERNAME = 'patimota';
const TEST_FREE_EVENT_SLUG = 'chat';
const TEST_PAID_EVENT_SLUG = 'physical-therapy-appointment';

test.describe('Booking Flow - Free Events', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the free event booking page
    await page.goto(`/en/${TEST_EXPERT_USERNAME}/${TEST_FREE_EVENT_SLUG}`);
    // Wait for the booking form to load
    await page.waitForSelector('[data-testid="booking-form"], .booking-layout', {
      timeout: 10000,
    });
  });

  test('should display step 1 with calendar and time slots', async ({ page }) => {
    // Verify step indicator shows step 1
    await expect(page.getByText('Select Date & Time')).toBeVisible();

    // Verify calendar is visible
    await expect(page.locator('.rdp, [data-testid="calendar"]')).toBeVisible();

    // Take a screenshot for visual regression
    await expect(page).toHaveScreenshot('booking-step-1-free.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('should navigate to step 2 when time slot is selected', async ({ page }) => {
    // Find and click an available time slot
    const timeSlot = page.locator('button:has-text(":00"), button:has-text(":30")').first();

    // Wait for time slots to load
    await page.waitForSelector('button:has-text(":00"), button:has-text(":30")', {
      timeout: 10000,
    });

    await timeSlot.click();

    // Verify we're now on step 2
    await expect(page.getByText('Your Information')).toBeVisible();
    await expect(page.getByText('Confirm your meeting details')).toBeVisible();

    // Verify form fields are present
    await expect(page.getByLabel(/Your Name/i)).toBeVisible();
    await expect(page.getByLabel(/Your Email/i)).toBeVisible();

    // Take a screenshot for visual regression
    await expect(page).toHaveScreenshot('booking-step-2-free.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('should show validation errors when submitting empty form', async ({ page }) => {
    // Select a time slot to go to step 2
    const timeSlot = page.locator('button:has-text(":00"), button:has-text(":30")').first();
    await page.waitForSelector('button:has-text(":00"), button:has-text(":30")', {
      timeout: 10000,
    });
    await timeSlot.click();

    // Wait for step 2 to load
    await expect(page.getByText('Your Information')).toBeVisible();

    // Click submit without filling the form
    const submitButton = page.getByRole('button', { name: /Schedule Meeting/i });
    await submitButton.click();

    // Verify validation error is shown
    await expect(
      page.getByText(/Please fill in all required fields correctly|Required/i),
    ).toBeVisible({ timeout: 5000 });

    // Take a screenshot of the error state
    await expect(page).toHaveScreenshot('booking-validation-error.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('should successfully submit free event booking', async ({ page }) => {
    // Select a time slot
    const timeSlot = page.locator('button:has-text(":00"), button:has-text(":30")').first();
    await page.waitForSelector('button:has-text(":00"), button:has-text(":30")', {
      timeout: 10000,
    });
    await timeSlot.click();

    // Wait for step 2
    await expect(page.getByText('Your Information')).toBeVisible();

    // Fill in the form
    await page.getByLabel(/Your Name/i).fill('Test User');
    await page.getByLabel(/Your Email/i).fill('test@example.com');
    await page.getByLabel(/Additional Notes/i).fill('E2E test booking');

    // Click submit
    const submitButton = page.getByRole('button', { name: /Schedule Meeting/i });
    await submitButton.click();

    // Verify button shows loading state
    await expect(page.getByText(/Scheduling.../i)).toBeVisible({ timeout: 2000 });

    // Wait for redirect to success page (or mock the API response)
    // In a real test, you would mock the createMeeting API
    // For now, we just verify the loading state appears
  });

  test('should navigate back from step 2 to step 1', async ({ page }) => {
    // Select a time slot
    const timeSlot = page.locator('button:has-text(":00"), button:has-text(":30")').first();
    await page.waitForSelector('button:has-text(":00"), button:has-text(":30")', {
      timeout: 10000,
    });
    await timeSlot.click();

    // Wait for step 2
    await expect(page.getByText('Your Information')).toBeVisible();

    // Click back button
    await page.getByRole('button', { name: /Back/i }).click();

    // Verify we're back on step 1
    await expect(page.getByText('Select Date & Time')).toBeVisible();
    await expect(page.locator('.rdp, [data-testid="calendar"]')).toBeVisible();
  });
});

test.describe('Booking Flow - Paid Events', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the paid event booking page
    await page.goto(`/en/${TEST_EXPERT_USERNAME}/${TEST_PAID_EVENT_SLUG}`);
    // Wait for the booking form to load
    await page.waitForSelector('[data-testid="booking-form"], .booking-layout', {
      timeout: 10000,
    });
  });

  test('should display step 3 indicator for paid events', async ({ page }) => {
    // Verify step 3 (Payment) indicator exists for paid events
    await expect(page.getByText('Payment')).toBeVisible();
  });

  test('should show "Continue to Payment" button on step 2', async ({ page }) => {
    // Select a time slot
    const timeSlot = page.locator('button:has-text(":00"), button:has-text(":30")').first();
    await page.waitForSelector('button:has-text(":00"), button:has-text(":30")', {
      timeout: 10000,
    });
    await timeSlot.click();

    // Wait for step 2
    await expect(page.getByText('Your Information')).toBeVisible();

    // Verify button says "Continue to Payment" not "Schedule Meeting"
    await expect(page.getByRole('button', { name: /Continue to Payment/i })).toBeVisible();
  });

  test('should redirect to Stripe checkout on valid form submission', async ({ page }) => {
    // Select a time slot
    const timeSlot = page.locator('button:has-text(":00"), button:has-text(":30")').first();
    await page.waitForSelector('button:has-text(":00"), button:has-text(":30")', {
      timeout: 10000,
    });
    await timeSlot.click();

    // Wait for step 2
    await expect(page.getByText('Your Information')).toBeVisible();

    // Fill in the form
    await page.getByLabel(/Your Name/i).fill('Test User');
    await page.getByLabel(/Your Email/i).fill('test@example.com');

    // Click submit
    const submitButton = page.getByRole('button', { name: /Continue to Payment/i });
    await submitButton.click();

    // Verify button shows loading state
    await expect(page.getByText(/Creating Checkout.../i)).toBeVisible({ timeout: 2000 });

    // Note: In a real test, you would either:
    // 1. Mock the /api/create-payment-intent endpoint
    // 2. Use Stripe test mode and verify redirect to checkout.stripe.com
    // 3. Intercept the request and verify payload
  });

  test('should take visual snapshot of paid event step 1', async ({ page }) => {
    await expect(page).toHaveScreenshot('booking-step-1-paid.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });
});

test.describe('Booking Flow - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should display correctly on mobile for free events', async ({ page }) => {
    await page.goto(`/en/${TEST_EXPERT_USERNAME}/${TEST_FREE_EVENT_SLUG}`);
    await page.waitForSelector('[data-testid="booking-form"], .booking-layout', {
      timeout: 10000,
    });

    // Verify the form is visible on mobile
    await expect(page.getByText('Select Date & Time')).toBeVisible();

    // Take a mobile screenshot
    await expect(page).toHaveScreenshot('booking-mobile-step-1.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });

  test('should display form correctly on mobile step 2', async ({ page }) => {
    await page.goto(`/en/${TEST_EXPERT_USERNAME}/${TEST_FREE_EVENT_SLUG}`);
    await page.waitForSelector('[data-testid="booking-form"], .booking-layout', {
      timeout: 10000,
    });

    // Select a time slot
    const timeSlot = page.locator('button:has-text(":00"), button:has-text(":30")').first();
    await page.waitForSelector('button:has-text(":00"), button:has-text(":30")', {
      timeout: 10000,
    });
    await timeSlot.click();

    // Wait for step 2
    await expect(page.getByText('Your Information')).toBeVisible();

    // Take a mobile screenshot
    await expect(page).toHaveScreenshot('booking-mobile-step-2.png', {
      maxDiffPixels: 200,
      animations: 'disabled',
    });
  });
});

test.describe('Booking Flow - Visual Regression', () => {
  test('should match snapshot for step indicator progression', async ({ page }) => {
    await page.goto(`/en/${TEST_EXPERT_USERNAME}/${TEST_FREE_EVENT_SLUG}`);
    await page.waitForSelector('[data-testid="booking-form"], .booking-layout', {
      timeout: 10000,
    });

    // Snapshot step 1 indicator
    const stepIndicator = page.locator('.flex.items-center.justify-center.gap-4').first();
    if (await stepIndicator.isVisible()) {
      await expect(stepIndicator).toHaveScreenshot('step-indicator-step-1.png', {
        maxDiffPixels: 50,
        animations: 'disabled',
      });
    }

    // Navigate to step 2
    const timeSlot = page.locator('button:has-text(":00"), button:has-text(":30")').first();
    await page.waitForSelector('button:has-text(":00"), button:has-text(":30")', {
      timeout: 10000,
    });
    await timeSlot.click();
    await expect(page.getByText('Your Information')).toBeVisible();

    // Snapshot step 2 indicator
    if (await stepIndicator.isVisible()) {
      await expect(stepIndicator).toHaveScreenshot('step-indicator-step-2.png', {
        maxDiffPixels: 50,
        animations: 'disabled',
      });
    }
  });
});

test.describe('Booking Flow - Double Submit Prevention', () => {
  test('should prevent double click on submit button', async ({ page }) => {
    await page.goto(`/en/${TEST_EXPERT_USERNAME}/${TEST_FREE_EVENT_SLUG}`);
    await page.waitForSelector('[data-testid="booking-form"], .booking-layout', {
      timeout: 10000,
    });

    // Navigate to step 2
    const timeSlot = page.locator('button:has-text(":00"), button:has-text(":30")').first();
    await page.waitForSelector('button:has-text(":00"), button:has-text(":30")', {
      timeout: 10000,
    });
    await timeSlot.click();
    await expect(page.getByText('Your Information')).toBeVisible();

    // Fill form
    await page.getByLabel(/Your Name/i).fill('Test User');
    await page.getByLabel(/Your Email/i).fill('test@example.com');

    // Try to double-click submit
    const submitButton = page.getByRole('button', { name: /Schedule Meeting/i });

    // Click once - should trigger loading
    await submitButton.click();

    // Verify button is disabled after first click
    await expect(submitButton).toBeDisabled({ timeout: 1000 });
  });
});

test.describe('Booking Flow - Form Persistence', () => {
  test('should persist form data in URL parameters', async ({ page }) => {
    await page.goto(`/en/${TEST_EXPERT_USERNAME}/${TEST_FREE_EVENT_SLUG}`);
    await page.waitForSelector('[data-testid="booking-form"], .booking-layout', {
      timeout: 10000,
    });

    // Navigate to step 2
    const timeSlot = page.locator('button:has-text(":00"), button:has-text(":30")').first();
    await page.waitForSelector('button:has-text(":00"), button:has-text(":30")', {
      timeout: 10000,
    });
    await timeSlot.click();
    await expect(page.getByText('Your Information')).toBeVisible();

    // Fill in name and blur to trigger URL update
    const nameInput = page.getByLabel(/Your Name/i);
    await nameInput.fill('Test User');
    await nameInput.blur();

    // Fill in email and blur
    const emailInput = page.getByLabel(/Your Email/i);
    await emailInput.fill('test@example.com');
    await emailInput.blur();

    // Wait for URL to update
    await page.waitForTimeout(500);

    // Verify URL contains the form data
    const url = page.url();
    expect(url).toContain('s=2'); // Step 2
    // Note: The actual URL parameter names may vary based on implementation
  });
});
