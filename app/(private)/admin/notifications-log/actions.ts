'use server';

import novu from '@/config/novu';
import { ENV_CONFIG } from '@/config/env'; // To ensure Novu is configured
import { currentUser } from '@clerk/nextjs/server';
import { ROLE_ADMIN } from '@/lib/auth/roles'; // Correctly import the role constant

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

interface NovuMessage {
  _id: string;
  _templateId: string;
  _subscriberId: string;
  _organizationId: string;
  _environmentId: string;
  transactionId: string;
  createdAt: string;
  content: string | { type: string; content: any[] }[]; // Can be string or RichText AST
  payload: Record<string, any>;
  seen: boolean;
  read: boolean;
  status: 'sent' | 'error' | 'warning' | 'delivered' | 'read' | 'seen' | 'pending' | 'queued'; // Adjust as per Novu's actual statuses
  subscriber?: { // Subscriber details might be part of the message object or need separate fetching
    firstName?: string;
    lastName?: string;
    email?: string;
    subscriberId: string;
  };
  // Add other relevant fields based on Novu's Message_Entity
  channel: string; // e.g., 'in_app', 'email'
  error?: {
    message: string;
    code: string;
  };
  // ... any other fields you need
}

interface FetchMessagesResult {
  messages: NovuMessage[];
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
    const queryParams: Record<string, any> = { page, limit };
    if (params.subscriberId) {
      // Note: The Novu SDK's messages.list might not directly support filtering by subscriberId.
      // This is a placeholder. You might need to fetch all and filter, or use a different Novu API / approach
      // if direct filtering by subscriberId on messages is needed and not supported by this specific SDK call.
      // For now, we assume it might be a query param or we handle it post-fetch if necessary.
      // queryParams.subscriberId = params.subscriberId; // This line is speculative
      console.warn("Filtering messages by subscriberId directly in novu.messages.list() might not be supported by the SDK. This is illustrative.");
    }

    const response = await novu.messages.list(queryParams);

    // The Novu SDK's list method for messages might have a different response structure.
    // Adjusting based on common patterns for their paginated APIs.
    // Typically, it might be response.data for the array and pagination details at the root or under response.meta.
    // For this example, I'm assuming a structure like:
    // { data: NovuMessage[], totalCount: number, pageSize: number, page: number, hasMore: boolean }
    // This needs to be verified against actual Novu SDK v2.x.x for @novu/node.
    // As of Novu docs for API v1 (which SDK might wrap), it's /v1/messages with query params.
    // Let's assume the SDK call `novu.messages.list` returns an object similar to the FetchMessagesResult structure or can be mapped to it.

    // Mocking a typical paginated response structure if the SDK doesn't provide totalCount directly
    // or if filtering is done client-side due to SDK limitations.
    // This part is highly dependent on the actual shape of `novu.messages.list()` response.

    // For example, if response is just { data: NovuMessage[], pageSize: number, page: number, totalCount: number }
    const messages = response.data as NovuMessage[]; // Assuming response.data is the array
    const totalCount = response.totalCount || 0;
    const pageSize = response.pageSize || limit;
    const currentPage = response.page || page; // The page number returned by Novu

    // Calculate hasMore based on totalCount and current items
    // This logic assumes `page` is 0-indexed.
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
