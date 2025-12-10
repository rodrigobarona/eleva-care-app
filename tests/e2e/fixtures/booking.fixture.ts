import { test as base, expect, type Page } from '@playwright/test';

/**
 * Booking Page Object Model
 *
 * Encapsulates common booking flow interactions for reuse across tests.
 * This follows the Page Object Model pattern recommended by Playwright.
 */
export class BookingPage {
  constructor(
    public readonly page: Page,
    public readonly expertUsername: string,
    public readonly eventSlug: string,
    public readonly locale: string = 'en',
  ) {}

  /**
   * Navigate to the booking page
   */
  async goto() {
    await this.page.goto(`/${this.locale}/${this.expertUsername}/${this.eventSlug}`);
    await this.page.waitForSelector('[data-testid="booking-form"], .booking-layout', {
      timeout: 10000,
    });
  }

  /**
   * Check if we're on step 1 (date/time selection)
   */
  async isOnStep1() {
    return await this.page.getByText('Select Date & Time').isVisible();
  }

  /**
   * Check if we're on step 2 (guest information)
   */
  async isOnStep2() {
    return await this.page.getByText('Your Information').isVisible();
  }

  /**
   * Check if we're on step 3 (payment/confirmation)
   */
  async isOnStep3() {
    const paymentText = await this.page.getByText('Payment').isVisible();
    const creatingCheckout = await this.page.getByText('Creating secure checkout').isVisible();
    return paymentText || creatingCheckout;
  }

  /**
   * Select the first available time slot
   */
  async selectFirstAvailableTimeSlot() {
    await this.page.waitForSelector('button:has-text(":00"), button:has-text(":30")', {
      timeout: 10000,
    });
    const timeSlot = this.page.locator('button:has-text(":00"), button:has-text(":30")').first();
    await timeSlot.click();
    await expect(this.page.getByText('Your Information')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Fill in guest information
   */
  async fillGuestInfo(data: { name: string; email: string; notes?: string }) {
    await this.page.getByLabel(/Your Name/i).fill(data.name);
    await this.page.getByLabel(/Your Email/i).fill(data.email);
    if (data.notes) {
      await this.page.getByLabel(/Additional Notes/i).fill(data.notes);
    }
  }

  /**
   * Click the submit button (different text for free vs paid)
   */
  async clickSubmit(isFreeEvent: boolean = true) {
    const buttonText = isFreeEvent ? /Schedule Meeting/i : /Continue to Payment/i;
    await this.page.getByRole('button', { name: buttonText }).click();
  }

  /**
   * Click the back button
   */
  async clickBack() {
    await this.page.getByRole('button', { name: /Back/i }).click();
  }

  /**
   * Check if validation error is visible
   */
  async hasValidationError() {
    return await this.page
      .getByText(/Please fill in all required fields correctly|Required/i)
      .isVisible();
  }

  /**
   * Check if form is in loading state
   */
  async isSubmitting() {
    const schedulingText = await this.page.getByText(/Scheduling.../i).isVisible();
    const creatingCheckoutText = await this.page.getByText(/Creating Checkout.../i).isVisible();
    return schedulingText || creatingCheckoutText;
  }

  /**
   * Get the current URL step parameter
   */
  async getCurrentStep(): Promise<string | null> {
    const url = new URL(this.page.url());
    return url.searchParams.get('s');
  }

  /**
   * Verify the submit button is disabled
   */
  async isSubmitButtonDisabled(isFreeEvent: boolean = true) {
    const buttonText = isFreeEvent ? /Schedule Meeting/i : /Continue to Payment/i;
    const button = this.page.getByRole('button', { name: buttonText });
    return await button.isDisabled();
  }
}

/**
 * Extended test fixture with BookingPage
 */
type BookingFixtures = {
  freeBookingPage: BookingPage;
  paidBookingPage: BookingPage;
};

export const test = base.extend<BookingFixtures>({
  freeBookingPage: async ({ page }, use) => {
    const bookingPage = new BookingPage(page, 'patimota', 'chat');
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture use(), not React hook
    await use(bookingPage);
  },

  paidBookingPage: async ({ page }, use) => {
    const bookingPage = new BookingPage(page, 'patimota', 'physical-therapy-appointment');
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture use(), not React hook
    await use(bookingPage);
  },
});

export { expect };
