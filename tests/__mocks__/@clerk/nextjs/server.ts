// Mock for @clerk/nextjs/server
export const auth = jest.fn().mockResolvedValue({ userId: 'test-user-id' });
export const currentUser = jest.fn().mockResolvedValue({ id: 'test-user-id' });
