import { NextResponse } from 'next/server';

interface ErrorWithStatus {
  status: number;
  message?: string;
}

/**
 * Handles API errors by logging them and returning a consistent error response
 *
 * @param error - The error to handle
 * @returns A NextResponse with appropriate status code and error message
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Check if the error has a status code
  if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
    const typedError = error as ErrorWithStatus;
    return NextResponse.json(
      { error: typedError.message || 'An error occurred' },
      { status: typedError.status },
    );
  }

  // Default to 500 Internal Server Error
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}
