'use server';

import { ENV_CONFIG } from '@/config/env';
import novu from '@/config/novu';
import { ROLE_ADMIN } from '@/lib/auth/roles';
// To ensure Novu is configured
import { currentUser } from '@clerk/nextjs/server';
import type { MessageResponseDto } from '@novu/api/models/components/messageresponsedto';

// Correctly import the role constant

// Helper to check admin role
async function isAdmin(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  // Check publicMetadata for the admin role.
  // Adjust if role is stored in privateMetadata or elsewhere.
  return user.publicMetadata?.role === ROLE_ADMIN;
}

interface FetchMessagesParams {
  page?: number; // Novu uses 0-indexed page for messages
  limit?: number;
  // Add other filter parameters here as needed, e.g., subscriberId
  subscriberId?: string;
}

interface FetchMessagesResult {
  messages: MessageResponseDto[];
  totalCount: number;
  pageSize: number;
  currentPage: number; // Current page returned by Novu
  hasMore: boolean;
}

export async function getNotificationMessages(
  params: FetchMessagesParams,
): Promise<FetchMessagesResult | { error: string }> {
  if (!ENV_CONFIG.NOVU_API_KEY || !ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER) {
    console.error('Novu API Key or Application Identifier is not configured.');
    return { error: 'Novu service is not configured.' };
  }

  if (!(await isAdmin())) {
    return { error: 'Unauthorized: Admin access required.' };
  }

  try {
    const page = params.page || 0; // Default to page 0 for Novu
    const limit = params.limit || 10; // Default to 10 per page

    // Construct query parameters for Novu SDK
    const queryParams: {
      page: number;
      limit: number;
      subscriberId?: string;
    } = { page, limit };
    if (params.subscriberId) {
      queryParams.subscriberId = params.subscriberId;
    }

    // Use the correct method: retrieve
    const response = await novu.messages.retrieve(queryParams);

    // The response structure is { headers, result }, where result contains the paginated data
    const messages = response.result.data;
    const totalCount = response.result.totalCount || 0;
    const pageSize = response.result.pageSize || limit;
    const currentPage = response.result.page || page;
    const hasMore = (currentPage + 1) * pageSize < totalCount;

    return {
      messages,
      totalCount,
      pageSize,
      currentPage,
      hasMore,
    };
  } catch (error) {
    console.error('Error fetching notification messages from Novu:', error);
    // Check if error is an instance of Novu's error class if available
    if (error instanceof Error) {
      return { error: `Failed to fetch messages: ${error.message}` };
    }
    return { error: 'An unknown error occurred while fetching messages.' };
  }
}
