import { getMinimumPayoutDelay, STRIPE_CONNECT_SUPPORTED_COUNTRIES } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import {
  createStripeConnectAccount,
  getConnectAccountBalance,
  getStripeConnectSetupOrLoginLink,
} from '@/lib/stripe';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Interface for Stripe errors based on Stripe SDK
interface StripeError {
  type: string;
  message?: string;
  raw?: {
    code?: string;
    param?: string;
    message?: string;
    type?: string;
    doc_url?: string;
    decline_code?: string;
    statusCode?: number;
    requestId?: string;
  };
  code?: string;
  statusCode?: number;
  requestId?: string;
  doc_url?: string;
  param?: string;
  detail?: string;
  headers?: { [header: string]: string };
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let email: string;
    let country: string;

    try {
      const body = await request.json();
      email = body.email;
      country = body.country;

      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      // Default country to PT if not provided
      if (!country) {
        console.log('Country not provided, defaulting to PT');
        country = 'PT';
      }
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Normalize country code (uppercase)
    const normalizedCountry = country.toUpperCase();

    // Validate country against supported list
    const isCountrySupported = STRIPE_CONNECT_SUPPORTED_COUNTRIES.includes(
      normalizedCountry as (typeof STRIPE_CONNECT_SUPPORTED_COUNTRIES)[number],
    );

    if (!isCountrySupported) {
      console.warn(`Unsupported country provided: ${country}`, {
        providedCountry: country,
        normalizedCountry,
        supportedCountriesCount: STRIPE_CONNECT_SUPPORTED_COUNTRIES.length,
      });

      // Instead of silently defaulting to PT, return an informative error
      return NextResponse.json(
        {
          error: 'Country not supported',
          message: `The country "${country}" is not supported for Stripe Connect accounts. Please select a supported country.`,
          supportedCountries: STRIPE_CONNECT_SUPPORTED_COUNTRIES,
          suggestedCountry: 'PT', // Still suggest PT as a fallback
        },
        { status: 400 },
      );
    }

    // At this point we know the country is supported and normalized
    country = normalizedCountry;

    console.log('Creating Connect account with country:', country);

    // Check if user already has a Connect account
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    // Check if user is identity verified before allowing Connect account creation
    if (!user.stripeIdentityVerified) {
      return NextResponse.json(
        {
          error: 'Identity verification required',
          redirectTo: '/account/identity',
          message: 'Please complete identity verification before creating a Connect account',
        },
        { status: 403 },
      );
    }

    if (user.stripeConnectAccountId) {
      // User already has a Connect account, return the setup/login link
      try {
        const url = await getStripeConnectSetupOrLoginLink(user.stripeConnectAccountId);
        return NextResponse.json({ url });
      } catch (error) {
        console.error('Error getting Connect setup link:', error);
        // If the Connect account exists but we can't get a link, create a new one
        console.log('Failed to get existing Connect account link, creating new account');
      }
    }

    // Create a new Connect account with retry logic
    const maxRetries = 3;
    let accountId = '';
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Creating Stripe Connect account attempt ${attempt}/${maxRetries}`);
        const result = await createStripeConnectAccount(email, country);
        accountId = result.accountId;

        // Break the loop if successful
        if (accountId) break;
      } catch (error) {
        console.error(`Connect account creation attempt ${attempt} failed:`, error);
        lastError = error;

        // Check for specific error types to provide better feedback
        if (error && typeof error === 'object' && 'type' in error) {
          const stripeError = error as StripeError;

          // Specific handling for payout schedule errors
          if (
            stripeError.raw?.param?.includes('payouts') ||
            stripeError.raw?.param?.includes('delay_days')
          ) {
            console.warn('Encountered payout schedule error:', stripeError);

            // Get the minimum delay required for this country
            const minimumDelay = getMinimumPayoutDelay(country);

            // Return a specific error for payout schedule issues
            return NextResponse.json(
              {
                error: 'Payout schedule error',
                message: `Unable to set the requested payout schedule. Stripe requires a minimum ${minimumDelay}-day delay for new accounts in ${country}.`,
                details: stripeError.raw?.message || stripeError.message,
                code: stripeError.raw?.code,
                minimumDelayDays: minimumDelay,
                country: country,
              },
              { status: 400 },
            );
          }
        }

        // If not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // If all attempts failed, return error
    if (!accountId) {
      const errorObject = lastError as StripeError;

      // Provide a detailed error response based on what went wrong
      return NextResponse.json(
        {
          error: 'Failed to create Connect account after multiple attempts',
          details: errorObject?.message || 'Unknown error',
          code: errorObject?.raw?.code || errorObject?.code,
          param: errorObject?.raw?.param,
          suggestion: 'Please try again or contact support if the issue persists.',
        },
        { status: 500 },
      );
    }

    // Update user record with Connect account ID
    await db
      .update(UserTable)
      .set({
        stripeConnectAccountId: accountId,
        updatedAt: new Date(),
      })
      .where(eq(UserTable.clerkUserId, userId));

    // Get the setup link for the new account
    const url = await getStripeConnectSetupOrLoginLink(accountId);

    return NextResponse.json({ accountId, url });
  } catch (error) {
    console.error('Error in Connect account creation:', error);
    return NextResponse.json(
      {
        error: 'Failed to create Connect account',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Please check your information and try again later.',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.stripeConnectAccountId) {
      return NextResponse.json({ error: 'No Connect account found' }, { status: 404 });
    }

    const balance = await getConnectAccountBalance(user.stripeConnectAccountId);
    return NextResponse.json({ balance });
  } catch (error) {
    console.error('Error fetching Connect account balance:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Connect account balance',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
