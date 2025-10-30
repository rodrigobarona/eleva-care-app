import { GET } from '@/app/api/user/check-kv-sync/route';
import { CustomerCache } from '@/lib/redis/manager';
import { auth, currentUser } from '@clerk/nextjs/server';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock dependencies
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
  currentUser: jest.fn(),
}));

jest.mock('@/lib/redis/manager', () => ({
  CustomerCache: {
    getCustomerByUserId: jest.fn(),
    getCustomer: jest.fn(),
  },
}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      retrieve: jest.fn(),
    },
  }));
});

describe('/api/user/check-kv-sync', () => {
  let mockAuth: jest.MockedFunction<typeof auth>;
  let mockCurrentUser: jest.MockedFunction<typeof currentUser>;
  let mockGetCustomerByUserId: jest.MockedFunction<typeof CustomerCache.getCustomerByUserId>;
  let mockGetCustomer: jest.MockedFunction<typeof CustomerCache.getCustomer>;
  let mockStripe: any;
  let consoleSpy: any;

  // Mock data
  const mockUserId = 'user_123';
  const mockCustomerId = 'cus_test123';
  const mockEmail = 'test@example.com';
  const mockUser = {
    id: mockUserId,
    firstName: 'John',
    lastName: 'Doe',
    primaryEmailAddressId: 'email_123',
    emailAddresses: [
      {
        id: 'email_123',
        emailAddress: mockEmail,
      },
    ],
  } as any;

  const mockCachedCustomerData = {
    stripeCustomerId: mockCustomerId,
    email: mockEmail,
    userId: mockUserId,
    name: 'John Doe',
    subscriptions: [],
    defaultPaymentMethod: null,
    created: 1640995200, // 2022-01-01
    updatedAt: 1640995200,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup console spy to capture logs
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Setup mocks
    mockAuth = jest.mocked(auth);
    mockCurrentUser = jest.mocked(currentUser);
    mockGetCustomerByUserId = jest.mocked(CustomerCache.getCustomerByUserId);
    mockGetCustomer = jest.mocked(CustomerCache.getCustomer);

    // Setup Stripe mock
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require('stripe');
    mockStripe = new Stripe();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated (no userId)', async () => {
      mockAuth.mockResolvedValue({ userId: null } as any);
      mockCurrentUser.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 401 when user is not authenticated (no user object)', async () => {
      mockAuth.mockResolvedValue({ userId: mockUserId } as any);
      mockCurrentUser.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Two-Step Customer Lookup', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ userId: mockUserId } as any);
      mockCurrentUser.mockResolvedValue(mockUser);
    });

    it('should successfully retrieve customer data using two-step process', async () => {
      // Step 1: Get customer ID by userId
      mockGetCustomerByUserId.mockResolvedValue(mockCustomerId);

      // Step 2: Get customer data by customerId
      mockGetCustomer.mockResolvedValue(mockCachedCustomerData);

      // Mock Stripe customer exists and matches
      mockStripe.customers.retrieve.mockResolvedValue({
        id: mockCustomerId,
        email: mockEmail,
        name: 'John Doe',
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isInSync).toBe(true);
      expect(data.debug.hasCustomerId).toBe(true);
      expect(data.debug.hasCustomerData).toBe(true);
      expect(data.debug.customerId).toBe(mockCustomerId);
      expect(data.debug.basicDataInSync).toBe(true);
      expect(data.debug.stripeDataInSync).toBe(true);
      expect(data.debug.cacheSource).toBe('unified_customer_cache');
      expect(data.debug.retrievalMethod).toBe('two_step_customer_lookup');
      expect(data.debug.userIdMapping).toBe(true);
      expect(data.debug.customerDataRetrieval).toBe(true);

      // Verify the two-step process was used
      expect(mockGetCustomerByUserId).toHaveBeenCalledWith(mockUserId);
      expect(mockGetCustomer).toHaveBeenCalledWith(mockCustomerId);
    });

    it('should handle case when customer ID mapping does not exist', async () => {
      // Step 1: No customer ID found
      mockGetCustomerByUserId.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isInSync).toBe(false);
      expect(data.debug.hasCustomerId).toBe(false);
      expect(data.debug.hasCustomerData).toBe(false);
      expect(data.debug.customerId).toBe(null);
      expect(data.debug.basicDataInSync).toBe(false);
      expect(data.debug.stripeDataInSync).toBe(true); // No Stripe validation needed
      expect(data.debug.userIdMapping).toBe(false);
      expect(data.debug.customerDataRetrieval).toBe(false);

      // Verify only step 1 was called
      expect(mockGetCustomerByUserId).toHaveBeenCalledWith(mockUserId);
      expect(mockGetCustomer).not.toHaveBeenCalled();
    });

    it('should handle case when customer ID exists but customer data does not', async () => {
      // Step 1: Get customer ID
      mockGetCustomerByUserId.mockResolvedValue(mockCustomerId);

      // Step 2: No customer data found
      mockGetCustomer.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isInSync).toBe(false);
      expect(data.debug.hasCustomerId).toBe(true);
      expect(data.debug.hasCustomerData).toBe(false);
      expect(data.debug.customerId).toBe(mockCustomerId);
      expect(data.debug.basicDataInSync).toBe(false);
      expect(data.debug.stripeDataInSync).toBe(true); // No Stripe validation needed
      expect(data.debug.userIdMapping).toBe(true);
      expect(data.debug.customerDataRetrieval).toBe(false);

      // Verify both steps were called
      expect(mockGetCustomerByUserId).toHaveBeenCalledWith(mockUserId);
      expect(mockGetCustomer).toHaveBeenCalledWith(mockCustomerId);
    });

    it('should handle CustomerCache.getCustomer throwing an error', async () => {
      // Step 1: Get customer ID
      mockGetCustomerByUserId.mockResolvedValue(mockCustomerId);

      // Step 2: Cache retrieval fails
      mockGetCustomer.mockRejectedValue(new Error('Redis connection failed'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isInSync).toBe(false);
      expect(data.debug.hasCustomerId).toBe(true);
      expect(data.debug.hasCustomerData).toBe(false);
      expect(data.debug.customerId).toBe(mockCustomerId);
      expect(data.debug.basicDataInSync).toBe(false);
      expect(data.debug.userIdMapping).toBe(true);
      expect(data.debug.customerDataRetrieval).toBe(false);

      // Should log warning about cache failure
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to retrieve customer data from cache:',
        expect.any(Error),
      );
    });
  });

  describe('Basic Data Synchronization', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ userId: mockUserId } as any);
      mockCurrentUser.mockResolvedValue(mockUser);
      mockGetCustomerByUserId.mockResolvedValue(mockCustomerId);
    });

    it('should detect when basic data is in sync', async () => {
      mockGetCustomer.mockResolvedValue(mockCachedCustomerData);

      const response = await GET();
      const data = await response.json();

      expect(data.debug.basicDataInSync).toBe(true);
    });

    it('should detect when email does not match', async () => {
      const mismatchedData = {
        ...mockCachedCustomerData,
        email: 'different@example.com',
      };
      mockGetCustomer.mockResolvedValue(mismatchedData);

      const response = await GET();
      const data = await response.json();

      expect(data.debug.basicDataInSync).toBe(false);
      expect(data.isInSync).toBe(false);
    });

    it('should detect when name does not match', async () => {
      const mismatchedData = {
        ...mockCachedCustomerData,
        name: 'Jane Smith',
      };
      mockGetCustomer.mockResolvedValue(mismatchedData);

      const response = await GET();
      const data = await response.json();

      expect(data.debug.basicDataInSync).toBe(false);
      expect(data.isInSync).toBe(false);
    });

    it('should detect when userId does not match', async () => {
      const mismatchedData = {
        ...mockCachedCustomerData,
        userId: 'different_user_id',
      };
      mockGetCustomer.mockResolvedValue(mismatchedData);

      const response = await GET();
      const data = await response.json();

      expect(data.debug.basicDataInSync).toBe(false);
      expect(data.isInSync).toBe(false);
    });
  });

  describe('Stripe Data Synchronization', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ userId: mockUserId } as any);
      mockCurrentUser.mockResolvedValue(mockUser);
      mockGetCustomerByUserId.mockResolvedValue(mockCustomerId);
      mockGetCustomer.mockResolvedValue(mockCachedCustomerData);
    });

    it('should detect when Stripe customer exists and email matches', async () => {
      mockStripe.customers.retrieve.mockResolvedValue({
        id: mockCustomerId,
        email: mockEmail,
        name: 'John Doe',
      });

      const response = await GET();
      const data = await response.json();

      expect(data.debug.stripeDataInSync).toBe(true);
      expect(data.isInSync).toBe(true);
      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith(mockCustomerId);
    });

    it('should detect when Stripe customer email does not match', async () => {
      mockStripe.customers.retrieve.mockResolvedValue({
        id: mockCustomerId,
        email: 'different@example.com',
        name: 'John Doe',
      });

      const response = await GET();
      const data = await response.json();

      expect(data.debug.stripeDataInSync).toBe(false);
      expect(data.isInSync).toBe(false);
    });

    it('should detect when Stripe customer was deleted', async () => {
      mockStripe.customers.retrieve.mockResolvedValue({
        id: mockCustomerId,
        deleted: true,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.debug.stripeDataInSync).toBe(false);
      expect(data.isInSync).toBe(false);
    });

    it('should handle Stripe API errors', async () => {
      mockStripe.customers.retrieve.mockRejectedValue(new Error('No such customer: cus_test123'));

      const response = await GET();
      const data = await response.json();

      expect(data.debug.stripeDataInSync).toBe(false);
      expect(data.isInSync).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Error checking Stripe customer:',
        expect.any(Error),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockAuth.mockRejectedValue(new Error('Authentication service error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to check KV synchronization');
      expect(console.error).toHaveBeenCalledWith('Error checking KV sync:', expect.any(Error));
    });
  });

  describe('Logging and Debug Information', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ userId: mockUserId } as any);
      mockCurrentUser.mockResolvedValue(mockUser);
      mockGetCustomerByUserId.mockResolvedValue(mockCustomerId);
      mockGetCustomer.mockResolvedValue(mockCachedCustomerData);
    });

    it('should log sync check initiation', async () => {
      await GET();

      expect(console.log).toHaveBeenCalledWith('Checking KV sync status for user:', {
        userId: mockUserId,
        email: mockEmail,
      });
    });

    it('should include comprehensive debug information', async () => {
      mockStripe.customers.retrieve.mockResolvedValue({
        id: mockCustomerId,
        email: mockEmail,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.debug).toEqual({
        hasCustomerId: true,
        hasCustomerData: true,
        customerId: mockCustomerId,
        basicDataInSync: true,
        stripeDataInSync: true,
        cacheSource: 'unified_customer_cache',
        retrievalMethod: 'two_step_customer_lookup',
        userIdMapping: true,
        customerDataRetrieval: true,
      });
    });
  });
});
