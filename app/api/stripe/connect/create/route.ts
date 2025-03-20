import { STRIPE_CONNECT_SUPPORTED_COUNTRIES } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { createConnectAccountWithVerifiedIdentity } from '@/lib/stripe/identity';
import { currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

type SupportedCountry = (typeof STRIPE_CONNECT_SUPPORTED_COUNTRIES)[number];

// Validate if a string is a supported country code
function isValidCountry(country: string): country is SupportedCountry {
  return STRIPE_CONNECT_SUPPORTED_COUNTRIES.includes(country as SupportedCountry);
}

/**
 * POST /api/stripe/connect/create
 *
 * Creates a Stripe Connect account for the current user
 * This endpoint requires the user to have completed identity verification first
 *
 * @returns 200 - Success with onboarding URL
 * @returns 401 - Unauthorized if no user is authenticated
 * @returns 404 - User not found in database
 * @returns 422 - Invalid or unsupported country code
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

    // Get and validate request body for country
    let body: { country?: string };
    try {
      body = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Request body must be valid JSON' },
        { status: 422 },
      );
    }

    const { country = 'US' } = body;

    // Validate country code early
    if (!isValidCountry(country)) {
      return NextResponse.json(
        {
          error: 'Invalid country code',
          details: `Country must be one of: ${STRIPE_CONNECT_SUPPORTED_COUNTRIES.join(', ')}`,
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
      country,
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
