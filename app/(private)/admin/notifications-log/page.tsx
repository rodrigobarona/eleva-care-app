'use client';

import { Button } from '@/components/atoms/button';
// Assuming Button component exists
import { Input } from '@/components/atoms/input';
import type { MessageResponseDto } from '@novu/api/models/components/messageresponsedto';
// Assuming Input component exists
import { debounce } from 'lodash';
import { useEffect, useState } from 'react';

import { getNotificationMessages } from './actions';

interface FetchResult {
  messages: MessageResponseDto[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  hasMore: boolean;
}

export default function NotificationsLogPage() {
  const [data, setData] = useState<FetchResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0); // Novu pages are 0-indexed
  const [subscriberIdFilter, setSubscriberIdFilter] = useState<string>('');

  const limit = 10; // Items per page

  const fetchLogs = async (page: number, subscriberId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getNotificationMessages({ page, limit, subscriberId });
      if ('error' in result) {
        setError(result.error);
        setData(null);
      } else {
        setData(result);
        // setCurrentPage(result.currentPage); // Update current page based on response
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Debounced fetch for subscriber ID filter
  const debouncedFetchBySubscriberId = debounce((subId: string) => {
    setCurrentPage(0); // Reset to first page when filter changes
    fetchLogs(0, subId.trim() === '' ? undefined : subId.trim());
  }, 500);

  useEffect(() => {
    fetchLogs(
      currentPage,
      subscriberIdFilter.trim() === '' ? undefined : subscriberIdFilter.trim(),
    );
  }, [currentPage, subscriberIdFilter]); // Re-fetch when currentPage or filter changes

  const handleSubscriberIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSubscriberIdFilter(event.target.value);
    debouncedFetchBySubscriberId(event.target.value);
  };

  const handleNextPage = () => {
    if (data?.hasMore) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  const handlePreviousPage = () => {
    setCurrentPage((prevPage) => Math.max(0, prevPage - 1));
  };

  const getMessageTitle = (message: MessageResponseDto): string => {
    if (message.subject) {
      return message.subject;
    }
    if (typeof message.content === 'string') {
      return message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '');
    }
    // Add more sophisticated content parsing if content is an object (e.g. rich text)
    return 'N/A';
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Notification Messages Log (Novu)</h1>

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Filter by Subscriber ID"
          value={subscriberIdFilter}
          onChange={handleSubscriberIdChange}
          className="max-w-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Note: Subscriber ID filtering might be approximate if not directly supported by the SDK
          for this call.
        </p>
      </div>

      {loading && <p>Loading messages...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {!loading && !error && data && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    Subscriber ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    Title/Content
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    Channel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                    Seen/Read
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {data.messages.map((message) => (
                  <tr key={message.id}>
                    <td
                      className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100"
                      title={message.id || 'N/A'}
                    >
                      {message.id?.slice(-8) || 'N/A'}...
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {message.subscriberId}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {getMessageTitle(message)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {message.channel}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {message.status}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {new Date(message.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {message.seen ? 'Seen' : 'Unseen'} / {message.read ? 'Read' : 'Unread'}
                    </td>
                  </tr>
                ))}
                {data.messages.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No messages found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div>
              <Button onClick={handlePreviousPage} disabled={currentPage === 0 || loading}>
                Previous
              </Button>
              <Button onClick={handleNextPage} disabled={!data.hasMore || loading} className="ml-2">
                Next
              </Button>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Page {data.currentPage + 1} (Total: {data.totalCount} messages)
            </div>
          </div>
        </>
      )}
    </div>
  );
}
