import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema';
import { getServerStripe } from '@/lib/integrations/stripe';
import * as Sentry from '@sentry/nextjs';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

const { logger } = Sentry;

export async function POST() {
  try {
    const { user } = await withAuth({ ensureSignedIn: true });

    const dbUser = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, user.id),
      columns: { stripeConnectAccountId: true },
    });

    if (!dbUser?.stripeConnectAccountId) {
      return NextResponse.json({ error: 'No Connect account found' }, { status: 404 });
    }

    const stripe = await getServerStripe();
    const accountSession = await stripe.accountSessions.create({
      account: dbUser.stripeConnectAccountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            external_account_collection: true,
            disable_stripe_user_authentication: true,
          },
        },
        account_management: {
          enabled: true,
          features: {
            external_account_collection: true,
            disable_stripe_user_authentication: true,
          },
        },
        payouts: {
          enabled: true,
          features: {
            instant_payouts: true,
            standard_payouts: true,
            edit_payout_schedule: true,
            external_account_collection: true,
            disable_stripe_user_authentication: true,
          },
        },
        notification_banner: { enabled: true },
        documents: { enabled: true },
      },
    });

    return NextResponse.json({ client_secret: accountSession.client_secret });
  } catch (error) {
    logger.error('Failed to create AccountSession', { error });
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to create account session' }, { status: 500 });
  }
}
