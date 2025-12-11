// Type definitions for test mocks
declare namespace NodeJS {
  interface Global {
    __mocks: {
      db: unknown;
      workosUser: unknown;
    };
  }
}

// Global type augmentation for Vitest
declare global {
  var __mocks: {
    db: unknown;
    workosUser: unknown;
  };
}

export {};
