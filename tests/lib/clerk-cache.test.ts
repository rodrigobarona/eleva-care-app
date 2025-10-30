import {
  getCachedUserById,
  getCachedUserByUsername,
  getCachedUsersByIds,
} from '@/lib/cache/clerk-cache';
import { redisManager } from '@/lib/redis/manager';
import { createClerkClient } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/server';

// Mock dependencies
jest.mock('@clerk/nextjs/server', () => ({
  createClerkClient: jest.fn(),
}));

jest.mock('@/lib/redis/manager', () => ({
  redisManager: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getCacheStats: jest.fn(),
  },
}));

describe('Clerk Cache', () => {
  const mockUser: User = {
    id: 'user_123',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    imageUrl: 'https://example.com/image.jpg',
  } as User;

  const mockClerkClient = {
    users: {
      getUserList: jest.fn(),
      getUser: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClerkClient as jest.Mock).mockReturnValue(mockClerkClient);
  });

  describe('getCachedUserByUsername', () => {
    it('should return cached user if available in Redis', async () => {
      (redisManager.get as jest.Mock).mockResolvedValue(JSON.stringify(mockUser));

      const result = await getCachedUserByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(redisManager.get).toHaveBeenCalledWith('clerk:test:username:testuser');
      expect(mockClerkClient.users.getUserList).not.toHaveBeenCalled();
    });

    it('should fetch from Clerk API if not cached', async () => {
      (redisManager.get as jest.Mock).mockResolvedValue(null);
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: [mockUser],
      });

      const result = await getCachedUserByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(mockClerkClient.users.getUserList).toHaveBeenCalledWith({
        username: ['testuser'],
        limit: 1,
      });
      expect(redisManager.set).toHaveBeenCalledWith(
        'clerk:test:username:testuser',
        JSON.stringify(mockUser),
        300,
      );
    });

    it('should return null if user not found', async () => {
      (redisManager.get as jest.Mock).mockResolvedValue(null);
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: [],
      });

      const result = await getCachedUserByUsername('nonexistent');

      expect(result).toBeNull();
      expect(redisManager.set).not.toHaveBeenCalled();
    });

    it('should handle corrupted cache data', async () => {
      (redisManager.get as jest.Mock).mockResolvedValue('invalid-json');
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: [mockUser],
      });

      const result = await getCachedUserByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(redisManager.del).toHaveBeenCalledWith('clerk:test:username:testuser');
    });
  });

  describe('getCachedUserById', () => {
    it('should return cached user if available in Redis', async () => {
      (redisManager.get as jest.Mock).mockResolvedValue(JSON.stringify(mockUser));

      const result = await getCachedUserById('user_123');

      expect(result).toEqual(mockUser);
      expect(redisManager.get).toHaveBeenCalledWith('clerk:test:id:user_123');
      expect(mockClerkClient.users.getUser).not.toHaveBeenCalled();
    });

    it('should fetch from Clerk API if not cached', async () => {
      (redisManager.get as jest.Mock).mockResolvedValue(null);
      mockClerkClient.users.getUser.mockResolvedValue(mockUser);

      const result = await getCachedUserById('user_123');

      expect(result).toEqual(mockUser);
      expect(mockClerkClient.users.getUser).toHaveBeenCalledWith('user_123');
      expect(redisManager.set).toHaveBeenCalledWith(
        'clerk:test:id:user_123',
        JSON.stringify(mockUser),
        300,
      );
    });

    it('should return null on API error', async () => {
      (redisManager.get as jest.Mock).mockResolvedValue(null);
      mockClerkClient.users.getUser.mockRejectedValue(new Error('API Error'));

      const result = await getCachedUserById('user_123');

      expect(result).toBeNull();
      expect(redisManager.set).not.toHaveBeenCalled();
    });
  });

  describe('getCachedUsersByIds', () => {
    const mockUsers: User[] = [
      { ...mockUser, id: 'user_1' },
      { ...mockUser, id: 'user_2' },
      { ...mockUser, id: 'user_3' },
    ] as User[];

    it('should return empty array for empty input', async () => {
      const result = await getCachedUsersByIds([]);

      expect(result).toEqual([]);
      expect(mockClerkClient.users.getUserList).not.toHaveBeenCalled();
    });

    it('should return cached users for small batches', async () => {
      const userIds = ['user_1', 'user_2'];
      (redisManager.get as jest.Mock).mockResolvedValue(JSON.stringify(mockUsers.slice(0, 2)));

      const result = await getCachedUsersByIds(userIds);

      expect(result).toEqual(mockUsers.slice(0, 2));
      expect(mockClerkClient.users.getUserList).not.toHaveBeenCalled();
    });

    it('should fetch from Clerk API if not cached', async () => {
      const userIds = ['user_1', 'user_2', 'user_3'];
      (redisManager.get as jest.Mock).mockResolvedValue(null);
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: mockUsers,
      });

      const result = await getCachedUsersByIds(userIds);

      expect(result).toEqual(mockUsers);
      expect(mockClerkClient.users.getUserList).toHaveBeenCalledWith({
        userId: userIds,
        limit: userIds.length,
      });
    });

    it('should handle batching for large user lists (> 500)', async () => {
      // Create 750 user IDs to test batching
      const userIds = Array.from({ length: 750 }, (_, i) => `user_${i}`);
      const batch1Users = Array.from({ length: 500 }, (_, i) => ({
        ...mockUser,
        id: `user_${i}`,
      })) as User[];
      const batch2Users = Array.from({ length: 250 }, (_, i) => ({
        ...mockUser,
        id: `user_${i + 500}`,
      })) as User[];

      (redisManager.get as jest.Mock).mockResolvedValue(null);
      mockClerkClient.users.getUserList
        .mockResolvedValueOnce({ data: batch1Users })
        .mockResolvedValueOnce({ data: batch2Users });

      const result = await getCachedUsersByIds(userIds);

      expect(result).toHaveLength(750);
      expect(mockClerkClient.users.getUserList).toHaveBeenCalledTimes(2);
      expect(mockClerkClient.users.getUserList).toHaveBeenNthCalledWith(1, {
        userId: userIds.slice(0, 500),
        limit: 500,
      });
      expect(mockClerkClient.users.getUserList).toHaveBeenNthCalledWith(2, {
        userId: userIds.slice(500, 750),
        limit: 250,
      });
    });

    it('should continue with other batches if one fails', async () => {
      const userIds = Array.from({ length: 750 }, (_, i) => `user_${i}`);
      const batch2Users = Array.from({ length: 250 }, (_, i) => ({
        ...mockUser,
        id: `user_${i + 500}`,
      })) as User[];

      (redisManager.get as jest.Mock).mockResolvedValue(null);
      mockClerkClient.users.getUserList
        .mockRejectedValueOnce(new Error('Batch 1 failed'))
        .mockResolvedValueOnce({ data: batch2Users });

      const result = await getCachedUsersByIds(userIds);

      expect(result).toHaveLength(250);
      expect(mockClerkClient.users.getUserList).toHaveBeenCalledTimes(2);
    });

    it('should cache small batches (≤ 10 users)', async () => {
      const userIds = ['user_1', 'user_2'];
      (redisManager.get as jest.Mock).mockResolvedValue(null);
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: mockUsers.slice(0, 2),
      });

      await getCachedUsersByIds(userIds);

      expect(redisManager.set).toHaveBeenCalled();
    });

    it('should not cache large batches (> 10 users)', async () => {
      const userIds = Array.from({ length: 15 }, (_, i) => `user_${i}`);
      const users = Array.from({ length: 15 }, (_, i) => ({
        ...mockUser,
        id: `user_${i}`,
      })) as User[];

      (redisManager.get as jest.Mock).mockResolvedValue(null);
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: users,
      });

      await getCachedUsersByIds(userIds);

      expect(redisManager.set).not.toHaveBeenCalled();
    });
  });
});
