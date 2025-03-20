import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { createConnectAccountWithVerifiedIdentity } from '@/lib/stripe/identity';
import { currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// List of supported countries for Stripe Connect
// https://stripe.com/global
const SUPPORTED_COUNTRIES = [
  'US', // United States
  'GB', // United Kingdom
  'CA', // Canada
  'AU', // Australia
  'NZ', // New Zealand
  'SG', // Singapore
  // Add more supported countries as needed
] as const;

// Zod schema for request validation
const createConnectAccountSchema = z
  .object({
    country: z.enum(SUPPORTED_COUNTRIES, {
      required_error: 'Country is required',
      invalid_type_error: 'Country must be a valid ISO 3166-1 alpha-2 code',
    }),
  })
  .strict();

type CreateConnectAccountRequest = z.infer<typeof createConnectAccountSchema>;

/**
 * POST /api/stripe/connect/create
 *
 * Creates a Stripe Connect account for the current user
 * This endpoint requires the user to have completed identity verification first
 *
 * @returns 200 - Success with onboarding URL
 * @returns 401 - Unauthorized if no user is authenticated
 * @returns 404 - User not found in database
 * @returns 422 - Invalid request body or unsupported country code
 * @returns 409 - Identity verification incomplete or Connect account already exists
 * @returns 500 - Server error during Connect account creation
 */
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user record from database
    const dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate request body
    let body: CreateConnectAccountRequest;
    try {
      const rawBody = await request.json();
      body = createConnectAccountSchema.parse(rawBody);
    } catch (error) {
      console.error('Error validating request body:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid request body',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 422 },
        );
      }

      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: 'Request body must be valid JSON with required fields',
        },
        { status: 422 },
      );
    }

    // Create Connect account with verified identity
    const result = await createConnectAccountWithVerifiedIdentity(
      user.id,
      user.emailAddresses && user.emailAddresses.length > 0
        ? user.emailAddresses[0].emailAddress
        : dbUser.email,
      body.country,
    );

    if (!result.success) {
      // Determine appropriate error status based on the error type
      if (result.error?.includes('identity verification')) {
        return NextResponse.json(
          {
            error: result.error,
            details: 'Complete identity verification before creating a Connect account',
          },
          { status: 409 },
        );
      }
      if (result.error?.includes('already exists')) {
        return NextResponse.json(
          { error: result.error, details: 'Connect account already exists for this user' },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: result.error, details: 'Failed to create Connect account' },
        { status: 422 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating Connect account:', error);
    return NextResponse.json(
      { error: 'Failed to create Connect account', details: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
