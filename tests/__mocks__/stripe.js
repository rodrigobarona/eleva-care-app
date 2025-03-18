// Mock for Stripe module
const stripeMock = (apiKey) => {
  return {
    // Products API
    products: {
      create: jest.fn().mockResolvedValue({ id: 'prod_mock123' }),
      update: jest.fn().mockResolvedValue({ id: 'prod_mock123', active: false }),
      retrieve: jest.fn().mockResolvedValue({ id: 'prod_mock123' }),
    },
    // Prices API
    prices: {
      create: jest.fn().mockResolvedValue({ id: 'price_mock123' }),
      update: jest.fn().mockResolvedValue({ id: 'price_mock123' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'price_mock123' }),
    },
    // Customers API
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_mock123' }),
      update: jest.fn().mockResolvedValue({ id: 'cus_mock123' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_mock123' }),
    },
    // Payment Intents
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_mock123', client_secret: 'secret_mock' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_mock123', status: 'succeeded' }),
    },
    // Checkout Sessions
    checkout: {
      sessions: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'cs_mock123', url: 'https://example.com/checkout' }),
        retrieve: jest.fn().mockResolvedValue({ id: 'cs_mock123', payment_status: 'paid' }),
      },
    },
    // Account
    accounts: {
      retrieve: jest.fn().mockResolvedValue({ id: 'acct_mock123' }),
    },
    // Other APIs can be added as needed
  };
};

// Add necessary config properties
stripeMock.LatestApiVersion = '2023-10-16';

module.exports = stripeMock;
