// Type definitions for test mocks
declare namespace NodeJS {
  interface Global {
    __mocks: {
      db: any;
      clerkUser: any;
      clerkUsers: any;
    };
  }
}

// Override the jest.fn type for our needs
declare namespace jest {
  interface MockInstance<T = any, Y extends any[] = any[]> {
    mockResolvedValue(value: any): this;
    mockImplementation(fn: (...args: any[]) => any): this;
    mockReturnValue(value: any): this;
  }
}
