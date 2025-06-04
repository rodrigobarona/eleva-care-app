// Type definitions for test mocks
declare namespace NodeJS {
  interface Global {
    __mocks: {
      db: unknown;
      clerkUser: unknown;
      clerkUsers: unknown;
    };
  }
}

// Override the jest.fn type for our needs
declare namespace jest {
  interface MockInstance {
    mockResolvedValue(value: unknown): this;
    mockImplementation(fn: (...args: unknown[]) => unknown): this;
    mockReturnValue(value: unknown): this;
  }
}
