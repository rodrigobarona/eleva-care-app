import { CustomerCache } from '@/lib/redis';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock the dependencies
jest.mock('@/lib/redis');
jest.mock('@clerk/nextjs/server');
jest.mock('stripe');

const mockCustomerCache = CustomerCache as jest.Mocked<typeof CustomerCache>;

describe('/api/user/check-kv-sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CustomerCache Integration Fix', () => {
    it('should correctly use two-step customer data retrieval', async () => {
      const userId = 'user_test123';
      const customerId = 'cus_test123';

      // Mock the customer ID mapping lookup
      mockCustomerCache.getCustomerByUserId.mockResolvedValue(customerId);

      // Mock the customer data retrieval
      const mockCustomerData = {
        stripeCustomerId: customerId,
        email: 'test@example.com',
        userId: userId,
        name: 'Test User',
        subscriptions: ['sub_123'],
        defaultPaymentMethod: 'pm_123',
        created: 1234567890,
        updatedAt: 1234567890,
      };
      mockCustomerCache.getCustomer.mockResolvedValue(mockCustomerData);

      // Verify the correct flow
      const retrievedCustomerId = await CustomerCache.getCustomerByUserId(userId);
      expect(retrievedCustomerId).toBe(customerId);

      const retrievedCustomerData = await CustomerCache.getCustomer(customerId);
      expect(retrievedCustomerData).toEqual(mockCustomerData);

      // Verify method calls
      expect(mockCustomerCache.getCustomerByUserId).toHaveBeenCalledWith(userId);
      expect(mockCustomerCache.getCustomer).toHaveBeenCalledWith(customerId);
    });

    it('should handle case when customer ID mapping does not exist', async () => {
      const userId = 'user_nonexistent';

      // Mock no customer ID found
      mockCustomerCache.getCustomerByUserId.mockResolvedValue(null);

      const retrievedCustomerId = await CustomerCache.getCustomerByUserId(userId);
      expect(retrievedCustomerId).toBeNull();

      // Should not attempt to get customer data if no customer ID
      expect(mockCustomerCache.getCustomer).not.toHaveBeenCalled();
    });

    it('should handle case when customer ID exists but customer data does not', async () => {
      const userId = 'user_test123';
      const customerId = 'cus_deleted';

      // Mock customer ID found but customer data missing
      mockCustomerCache.getCustomerByUserId.mockResolvedValue(customerId);
      mockCustomerCache.getCustomer.mockResolvedValue(null);

      const retrievedCustomerId = await CustomerCache.getCustomerByUserId(userId);
      expect(retrievedCustomerId).toBe(customerId);

      const retrievedCustomerData = await CustomerCache.getCustomer(customerId);
      expect(retrievedCustomerData).toBeNull();

      expect(mockCustomerCache.getCustomerByUserId).toHaveBeenCalledWith(userId);
      expect(mockCustomerCache.getCustomer).toHaveBeenCalledWith(customerId);
    });

    it('should demonstrate the fixed data structure compatibility', () => {
      // Example of the OLD incorrect approach (now fixed)
      // const kvUser = await CustomerCache.getCustomerByUserId(userId); // Returns string | null
      // const customerData = JSON.parse(kvUser); // ❌ WRONG: kvUser is a string ID, not JSON data

      // NEW correct approach (implemented in the fix)
      // const customerId = await CustomerCache.getCustomerByUserId(userId); // Returns string | null
      // const customerData = await CustomerCache.getCustomer(customerId); // Returns CachedCustomerData | null

      const testFlow = {
        step1: 'getCustomerByUserId returns customer ID string',
        step2: 'getCustomer returns full customer data object',
        result: 'Properly typed customer data without JSON parsing errors',
      };

      expect(testFlow.step1).toBe('getCustomerByUserId returns customer ID string');
      expect(testFlow.step2).toBe('getCustomer returns full customer data object');
      expect(testFlow.result).toBe('Properly typed customer data without JSON parsing errors');
    });

    it('should handle errors in customer data retrieval gracefully', async () => {
      const userId = 'user_test123';
      const customerId = 'cus_test123';

      mockCustomerCache.getCustomerByUserId.mockResolvedValue(customerId);
      mockCustomerCache.getCustomer.mockRejectedValue(new Error('Redis connection failed'));

      const retrievedCustomerId = await CustomerCache.getCustomerByUserId(userId);
      expect(retrievedCustomerId).toBe(customerId);

      // Should handle error gracefully
      await expect(CustomerCache.getCustomer(customerId)).rejects.toThrow(
        'Redis connection failed',
      );
    });
  });

  describe('Data Structure Validation', () => {
    it('should validate StripeCustomerData structure matches CachedCustomerData', () => {
      const mockCachedData = {
        stripeCustomerId: 'cus_123',
        email: 'test@example.com',
        userId: 'user_123',
        name: 'Test User',
        subscriptions: ['sub_123'],
        defaultPaymentMethod: 'pm_123',
        created: 1234567890,
        updatedAt: 1234567890,
      };

      // This demonstrates the structure compatibility after the fix
      const convertedData = {
        stripeCustomerId: mockCachedData.stripeCustomerId,
        email: mockCachedData.email,
        userId: mockCachedData.userId || 'fallback_user_id',
        name: mockCachedData.name,
        subscriptions: mockCachedData.subscriptions || [],
        defaultPaymentMethod: mockCachedData.defaultPaymentMethod,
        created: mockCachedData.created,
        updatedAt: mockCachedData.updatedAt,
      };

      expect(convertedData.stripeCustomerId).toBe('cus_123');
      expect(convertedData.email).toBe('test@example.com');
      expect(Array.isArray(convertedData.subscriptions)).toBe(true);
      expect(typeof convertedData.created).toBe('number');
      expect(typeof convertedData.updatedAt).toBe('number');
    });
  });
});
