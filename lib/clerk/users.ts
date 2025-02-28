import { clerkClient } from '@clerk/nextjs/server';

/**
 * Interface for Clerk API users
 * Modeled after what the actual API returns, which may differ from their official types
 */
interface ClerkApiUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  image_url: string | null;
  email_addresses: Array<{
    id: string;
    email_address: string;
  }>;
  created_at: number | string;
  updated_at: number | string;
  last_sign_in_at: number | string | null;
}

// Define our own simplified user interface based on what we actually need
export interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  emailAddresses: {
    id: string;
    emailAddress: string;
  }[];
  createdAt: string;
  updatedAt: string;
  lastSignInAt: string | null;
  username: string | null;
}

export interface ClerkUserWithRoles extends ClerkUser {
  role?: string;
}

/**
 * Transforms a Clerk API User into our simplified ClerkUser format
 */
function transformClerkUser<T extends ClerkApiUser>(user: T): ClerkUser {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    imageUrl: user.image_url,
    emailAddresses: user.email_addresses.map((email) => ({
      id: email.id,
      emailAddress: email.email_address,
    })),
    createdAt:
      typeof user.created_at === 'number'
        ? new Date(user.created_at).toISOString()
        : String(user.created_at),
    updatedAt:
      typeof user.updated_at === 'number'
        ? new Date(user.updated_at).toISOString()
        : String(user.updated_at),
    lastSignInAt: user.last_sign_in_at
      ? typeof user.last_sign_in_at === 'number'
        ? new Date(user.last_sign_in_at).toISOString()
        : String(user.last_sign_in_at)
      : null,
  };
}

/**
 * Fetches a list of all users from Clerk with pagination support
 *
 * @param page Page number starting from 1
 * @param pageSize Number of users per page
 * @returns Array of Clerk users
 */
export async function getClerkUsers(page = 1, pageSize = 20): Promise<ClerkUser[]> {
  const limit = Math.min(pageSize, 100); // Clerk imposes a max of 100 users per request
  const offset = (page - 1) * limit;

  try {
    const clerk = await clerkClient();
    const usersResponse = await clerk.users.getUserList({
      limit,
      offset,
      orderBy: '-created_at',
    });

    // Transform Clerk users to our simplified format
    return usersResponse.data.map((user) => transformClerkUser(user as unknown as ClerkApiUser));
  } catch (error) {
    console.error('Error fetching Clerk users:', error);
    throw new Error('Failed to fetch users');
  }
}

/**
 * Fetches a specific user from Clerk by their ID
 *
 * @param userId The Clerk user ID
 * @returns The user object or null if not found
 */
export async function getClerkUserById(userId: string): Promise<ClerkUser | null> {
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    return transformClerkUser(user as unknown as ClerkApiUser);
  } catch (error) {
    console.error(`Error fetching Clerk user with ID ${userId}:`, error);
    return null;
  }
}

/**
 * Fetches a batch of users from Clerk by their IDs
 *
 * @param userIds Array of Clerk user IDs
 * @returns Map of user IDs to user objects
 */
export async function getClerkUsersByIds(userIds: string[]): Promise<Map<string, ClerkUser>> {
  try {
    if (!userIds.length) return new Map();

    const clerk = await clerkClient();
    const users = await clerk.users.getUserList({
      userId: userIds,
    });

    const userMap = new Map<string, ClerkUser>();

    for (const user of users.data) {
      userMap.set(user.id, transformClerkUser(user as unknown as ClerkApiUser));
    }

    return userMap;
  } catch (error) {
    console.error('Error fetching Clerk users by IDs:', error);
    return new Map();
  }
}
