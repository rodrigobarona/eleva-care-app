import { POST } from '@/app/api/create-payment-intent/route';
import { db } from '@/drizzle/db';
import { getOrCreateStripeCustomer } from '@/lib/stripe';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Mock stripe-related methods first
const mockGetBaseUrl = jest.fn(() => 'https://example.com');
const mockGetOrCreateStripeCustomer = jest.fn();
const mockWithRetry = jest.fn((fn) => fn());
const mockCalculateApplicationFee = jest.fn((price) => Math.round(price * 0.15));

// Mock the Stripe instance
const mockStripeSessionCreate = jest.fn();
const mockStripeInstance = {
  checkout: {
    sessions: {
      create: mockStripeSessionCreate,
    },
  },
};

// Mock NextResponse
const mockNextResponseJson = jest.fn((data, options) => ({
  data,
  status: options?.status || 200,
}));

// Mock dependencies before imports
jest.mock('next/server', () => ({
  NextResponse: {
    json: mockNextResponseJson,
  },
}));

jest.mock('@/drizzle/db', () => ({
  db: {
    query: {
      EventTable: {
        findFirst: jest.fn(),
      },
    },
  },
}));

jest.mock('@/lib/stripe', () => ({
  getBaseUrl: mockGetBaseUrl,
  getOrCreateStripeCustomer: mockGetOrCreateStripeCustomer,
  withRetry: mockWithRetry,
  calculateApplicationFee: mockCalculateApplicationFee,
  STRIPE_CONFIG: {
    API_VERSION: '2023-10-16',
    CURRENCY: 'eur',
    PAYMENT_METHODS: ['card', 'multibanco'],
    PLATFORM_FEE_PERCENTAGE: 15,
  },
}));

jest.mock('stripe', () => {
  return jest.fn(() => mockStripeInstance);
});

describe('Payment Intent API', () => {
  let mockRequest: Request;
  const mockEvent = {
    id: 'event_123',
    clerkUserId: 'user_123',
    user: {
      stripeConnectAccountId: 'acct_123',
    },
  };

  const mockSessionResponse = {
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/pay/cs_test_123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up request body
    mockRequest = {
      json: jest.fn().mockResolvedValue({
        eventId: 'event_123',
        price: 10000, // 100 EUR
        meetingData: {
          guestEmail: 'customer@example.com',
          guestName: 'Test Customer',
          startTime: '2024-05-01T10:00:00Z',
          timezone: 'Europe/Madrid',
          duration: 60,
          date: '2024-05-01',
        },
        username: 'expert',
        eventSlug: 'consultation',
        requiresApproval: false,
      }),
    } as unknown as Request;

    // Set up DB response
    (db.query.EventTable.findFirst as jest.Mock).mockResolvedValue(mockEvent);

    // Set up Stripe customer response
    mockGetOrCreateStripeCustomer.mockResolvedValue('cus_123');

    // Set up Stripe session response
    mockStripeSessionCreate.mockResolvedValue(mockSessionResponse);
  });

  it('should create a checkout session successfully', async () => {
    const response = await POST(mockRequest);

    // Check we get the expected response
    expect(response.data).toEqual({ url: mockSessionResponse.url });
    expect(response.status).toBe(200);

    // Verify db was queried correctly
    expect(db.query.EventTable.findFirst).toHaveBeenCalledWith({
      where: expect.anything(), // We'll simplify this check
      with: { user: true },
    });

    // Verify customer was created/retrieved
    expect(mockGetOrCreateStripeCustomer).toHaveBeenCalledWith(undefined, 'customer@example.com');

    // Verify Stripe session was created with correct parameters
    expect(mockStripeSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_123',
        mode: 'payment',
        payment_intent_data: expect.objectContaining({
          application_fee_amount: 1500, // 15% of 10000
          transfer_data: {
            destination: 'acct_123',
          },
        }),
      }),
    );
  });

  it('should return 400 if required fields are missing', async () => {
    const invalidRequest = {
      json: jest.fn().mockResolvedValue({
        eventId: 'event_123',
        // price is missing
        meetingData: {
          guestEmail: 'customer@example.com',
          // startTime is missing
        },
      }),
    } as unknown as Request;

    const response = await POST(invalidRequest);

    expect(response.status).toBe(400);
    expect(response.data.message).toContain('Missing required fields');
  });

  it('should handle errors gracefully', async () => {
    // Make db throw an error
    (db.query.EventTable.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

    const response = await POST(mockRequest);

    expect(response.status).toBe(500);
    expect(response.data.error).toBe('Failed to create checkout session');
    expect(response.data.details).toContain('Database error');
  });
});
