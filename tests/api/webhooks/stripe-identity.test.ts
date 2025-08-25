import { GET, POST } from '@/app/api/webhooks/stripe-identity/route';
// Import mocked modules using ES6 syntax
import { db } from '@/drizzle/db';
import { syncIdentityVerificationToConnect } from '@/lib/stripe';
import { getIdentityVerificationStatus } from '@/lib/stripe/identity';
import { markStepCompleteForUser } from '@/server/actions/expert-setup';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';

// Mock Novu integration using manual mocks
jest.mock('@/app/utils/novu');
jest.mock('@/lib/novu-utils');

// Mock external dependencies
jest.mock('@/drizzle/db', () => ({
  db: {
    query: {
      UserTable: {
        findFirst: jest.fn(),
      },
    },
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({}),
      }),
    }),
  },
}));

jest.mock('@/lib/stripe/identity', () => ({
  getIdentityVerificationStatus: jest.fn(),
}));

jest.mock('@/server/actions/expert-setup', () => ({
  markStepCompleteForUser: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/stripe', () => ({
  syncIdentityVerificationToConnect: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

describe('Stripe Identity Webhook Handler', () => {
  let mockRequest: NextRequest;
  let mockStripeConstructEvent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables
    process.env.STRIPE_IDENTITY_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.STRIPE_SECRET_KEY = 'test-stripe-key';

    // Setup mock request
    mockRequest = {
      text: jest.fn().mockResolvedValue('{"type":"identity.verification_session.verified"}'),
      headers: {
        get: jest.fn().mockReturnValue('test-stripe-signature'),
      },
    } as any;

    // Setup Stripe webhook constructor mock
    mockStripeConstructEvent = jest.fn();
    (Stripe as any).mockImplementation(() => ({
      webhooks: {
        constructEvent: mockStripeConstructEvent,
      },
    }));
  });

  afterEach(() => {
    delete process.env.STRIPE_IDENTITY_WEBHOOK_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
  });

  describe('GET handler', () => {
    it('should return 405 Method Not Allowed', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
    });
  });

  describe('POST - Request Validation', () => {
    it('should return 500 when STRIPE_IDENTITY_WEBHOOK_SECRET is missing', async () => {
      delete process.env.STRIPE_IDENTITY_WEBHOOK_SECRET;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error processing webhook');
    });

    it('should return 400 when Stripe signature header is missing', async () => {
      mockRequest.headers.get = jest.fn().mockReturnValue(null);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing Stripe signature');
    });

    it('should return 400 when webhook signature verification fails', async () => {
      mockStripeConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid signature');
    });
  });

  describe('POST - Event Processing', () => {
    beforeEach(() => {
      // Setup successful webhook verification
      mockStripeConstructEvent.mockReturnValue({
        type: 'identity.verification_session.verified',
        id: 'evt_test_123',
        data: {
          object: {
            id: 'vs_test_123',
            status: 'verified',
            metadata: {
              clerkUserId: 'user_123',
            },
            verification_flow: 'standard',
          },
        },
      });

      // Setup successful identity status lookup
      (getIdentityVerificationStatus as jest.Mock).mockResolvedValue({
        status: 'verified',
        details: { verified: true },
      });
    });

    it('should process identity.verification_session.verified event successfully', async () => {
      // Setup user found by verification ID
      (db.query.UserTable.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        clerkUserId: 'user_123',
        stripeConnectAccountId: 'acct_test_123',
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.status).toBe('success');
      expect(db.update).toHaveBeenCalled();
      expect(markStepCompleteForUser).toHaveBeenCalledWith('identity', 'user_123');
    });

    it('should handle user lookup by Clerk ID when verification ID lookup fails', async () => {
      // First call (by verification ID) returns null, second call (by Clerk ID) returns user
      (db.query.UserTable.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 1,
          clerkUserId: 'user_123',
          stripeConnectAccountId: 'acct_test_123',
        });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(db.query.UserTable.findFirst).toHaveBeenCalledTimes(2);
      expect(db.update).toHaveBeenCalled();
    });

    it('should skip processing when no user is found', async () => {
      (db.query.UserTable.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(markStepCompleteForUser).not.toHaveBeenCalled();
    });

    it('should handle verification status requiring_input', async () => {
      mockStripeConstructEvent.mockReturnValue({
        type: 'identity.verification_session.requires_input',
        id: 'evt_test_123',
        data: {
          object: {
            id: 'vs_test_123',
            status: 'requires_input',
            metadata: {
              clerkUserId: 'user_123',
            },
          },
        },
      });

      (getIdentityVerificationStatus as jest.Mock).mockResolvedValue({
        status: 'requires_input',
        details: { verified: false },
      });

      (db.query.UserTable.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        clerkUserId: 'user_123',
        stripeConnectAccountId: 'acct_test_123',
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(db.update).toHaveBeenCalled();
      expect(markStepCompleteForUser).not.toHaveBeenCalled();
    });

    it('should skip Connect sync when user has no Connect account', async () => {
      (db.query.UserTable.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        clerkUserId: 'user_123',
        stripeConnectAccountId: null, // No Connect account
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(syncIdentityVerificationToConnect).not.toHaveBeenCalled();
    });

    it('should retry Connect sync on failure', async () => {
      (db.query.UserTable.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        clerkUserId: 'user_123',
        stripeConnectAccountId: 'acct_test_123',
      });

      // First two attempts fail, third succeeds
      (syncIdentityVerificationToConnect as jest.Mock)
        .mockResolvedValueOnce({ success: false, message: 'Retry later' })
        .mockResolvedValueOnce({ success: false, message: 'Still failing' })
        .mockResolvedValueOnce({ success: true, verificationStatus: 'verified' });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(syncIdentityVerificationToConnect).toHaveBeenCalledTimes(3);
    });

    it('should handle Connect sync maximum retries exceeded', async () => {
      (db.query.UserTable.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        clerkUserId: 'user_123',
        stripeConnectAccountId: 'acct_test_123',
      });

      // All attempts fail
      (syncIdentityVerificationToConnect as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Persistent failure',
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(syncIdentityVerificationToConnect).toHaveBeenCalledTimes(3);
    });

    it('should skip non-identity verification events', async () => {
      mockStripeConstructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        id: 'evt_test_123',
        data: {
          object: {
            id: 'pi_test_123',
          },
        },
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(db.query.UserTable.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('POST - Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockStripeConstructEvent.mockReturnValue({
        type: 'identity.verification_session.verified',
        id: 'evt_test_123',
        data: {
          object: {
            id: 'vs_test_123',
            status: 'verified',
            metadata: {
              clerkUserId: 'user_123',
            },
          },
        },
      });

      (db.query.UserTable.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      );

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
    });

    it('should handle getIdentityVerificationStatus errors', async () => {
      mockStripeConstructEvent.mockReturnValue({
        type: 'identity.verification_session.verified',
        id: 'evt_test_123',
        data: {
          object: {
            id: 'vs_test_123',
            status: 'verified',
            metadata: {
              clerkUserId: 'user_123',
            },
          },
        },
      });

      (db.query.UserTable.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        clerkUserId: 'user_123',
      });

      (getIdentityVerificationStatus as jest.Mock).mockRejectedValue(new Error('Stripe API error'));

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
    });

    it('should handle markStepCompleteForUser errors gracefully', async () => {
      mockStripeConstructEvent.mockReturnValue({
        type: 'identity.verification_session.verified',
        id: 'evt_test_123',
        data: {
          object: {
            id: 'vs_test_123',
            status: 'verified',
            metadata: {
              clerkUserId: 'user_123',
            },
          },
        },
      });

      (db.query.UserTable.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        clerkUserId: 'user_123',
      });

      (getIdentityVerificationStatus as jest.Mock).mockResolvedValue({
        status: 'verified',
        details: { verified: true },
      });

      // Make markStepCompleteForUser throw an error - the webhook should continue and return 200
      (markStepCompleteForUser as jest.Mock).mockImplementation(() => {
        throw new Error('Expert setup service error');
      });

      const response = await POST(mockRequest);

      // The webhook continues processing even if expert setup fails
      expect(response.status).toBe(200);
      // Verify that the database update still happened
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle verification session without metadata', async () => {
      mockStripeConstructEvent.mockReturnValue({
        type: 'identity.verification_session.verified',
        id: 'evt_test_123',
        data: {
          object: {
            id: 'vs_test_123',
            status: 'verified',
            metadata: null, // No metadata
          },
        },
      });

      (db.query.UserTable.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      // The test should verify that findFirst was called with the verification ID
      expect(db.query.UserTable.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          field: expect.any(Object),
          value: 'vs_test_123',
        }),
      });
    });

    it('should handle verification session with empty metadata', async () => {
      mockStripeConstructEvent.mockReturnValue({
        type: 'identity.verification_session.verified',
        id: 'evt_test_123',
        data: {
          object: {
            id: 'vs_test_123',
            status: 'verified',
            metadata: {}, // Empty metadata
          },
        },
      });

      (db.query.UserTable.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should handle user update with missing verification ID', async () => {
      mockStripeConstructEvent.mockReturnValue({
        type: 'identity.verification_session.verified',
        id: 'evt_test_123',
        data: {
          object: {
            id: 'vs_test_123',
            status: 'verified',
            metadata: {
              clerkUserId: 'user_123',
            },
          },
        },
      });

      // User found by Clerk ID but needs verification ID update
      (db.query.UserTable.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // First lookup by verification ID fails
        .mockResolvedValueOnce({
          // Second lookup by Clerk ID succeeds
          id: 1,
          clerkUserId: 'user_123',
          stripeIdentityVerificationId: null,
        });

      (getIdentityVerificationStatus as jest.Mock).mockResolvedValue({
        status: 'verified',
        details: { verified: true },
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(db.update).toHaveBeenCalledTimes(2); // Once for verification ID, once for status
    });
  });
});
