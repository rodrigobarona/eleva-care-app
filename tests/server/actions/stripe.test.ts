// Now import the actions that use the mocked modules
import { createOrUpdateStripeCustomer, getCustomerPaymentMethods } from '@/server/actions/stripe';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Define mocks before imports that use them
const mockStripe = {
  customers: {
    create: jest.fn(),
    update: jest.fn(),
    search: jest.fn(),
  },
  paymentMethods: {
    list: jest.fn(),
  },
};

const mockWithRetry = jest.fn((fn) => fn());

// Mock the stripe module
jest.mock('@/lib/stripe', () => ({
  withRetry: mockWithRetry,
  stripe: mockStripe,
}));

describe('Stripe Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrUpdateStripeCustomer', () => {
    const mockCustomerData = {
      email: 'test@example.com',
      name: 'Test User',
      clerkUserId: 'user_123456',
    };

    it('should create a new customer when no stripeCustomerId is provided', async () => {
      const mockCustomer = { id: 'cus_new123', email: mockCustomerData.email };
      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const result = await createOrUpdateStripeCustomer(mockCustomerData);

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: mockCustomerData.email,
        name: mockCustomerData.name,
        metadata: { clerkUserId: mockCustomerData.clerkUserId },
      });
      expect(result).toEqual({
        customerId: mockCustomer.id,
        email: mockCustomer.email,
      });
    });

    it('should update an existing customer when stripeCustomerId is provided', async () => {
      const stripeCustomerId = 'cus_existing123';
      const mockCustomer = { id: stripeCustomerId, email: mockCustomerData.email };
      mockStripe.customers.update.mockResolvedValue(mockCustomer);

      const result = await createOrUpdateStripeCustomer({
        ...mockCustomerData,
        stripeCustomerId,
      });

      expect(mockStripe.customers.update).toHaveBeenCalledWith(stripeCustomerId, {
        email: mockCustomerData.email,
        name: mockCustomerData.name,
        metadata: { clerkUserId: mockCustomerData.clerkUserId },
      });
      expect(result).toEqual({
        customerId: mockCustomer.id,
        email: mockCustomer.email,
      });
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Stripe API error');
      mockStripe.customers.create.mockRejectedValue(error);

      await expect(createOrUpdateStripeCustomer(mockCustomerData)).rejects.toThrow(
        'Stripe API error',
      );
    });
  });

  describe('getCustomerPaymentMethods', () => {
    it('should retrieve payment methods for a customer', async () => {
      const customerId = 'cus_123';
      const mockPaymentMethods = {
        data: [
          { id: 'pm_123', type: 'card', card: { brand: 'visa', last4: '4242' } },
          { id: 'pm_456', type: 'card', card: { brand: 'mastercard', last4: '5555' } },
        ],
      };

      mockStripe.paymentMethods.list.mockResolvedValue(mockPaymentMethods);

      const result = await getCustomerPaymentMethods(customerId);

      expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
        customer: customerId,
        type: 'card',
      });
      expect(result).toEqual(mockPaymentMethods.data);
    });

    it('should return an empty array if no payment methods are found', async () => {
      const customerId = 'cus_123';
      mockStripe.paymentMethods.list.mockResolvedValue({ data: [] });

      const result = await getCustomerPaymentMethods(customerId);

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const customerId = 'cus_123';
      const error = new Error('Stripe API error');
      mockStripe.paymentMethods.list.mockRejectedValue(error);

      await expect(getCustomerPaymentMethods(customerId)).rejects.toThrow('Stripe API error');
    });
  });
});
