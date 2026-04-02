import { calculateApplicationFee, STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { SessionPackTable } from '@/drizzle/schema';
import { getOrCreateStripeCustomer } from '@/lib/integrations/stripe';
import { RateLimitCache } from '@/lib/redis/manager';
import { checkBotId } from 'botid/server';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { after, NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

const RATE_LIMITS = {
  USER: { maxAttempts: 5, windowSeconds: 900 },
  IP: { maxAttempts: 20, windowSeconds: 900 },
  GLOBAL: { maxAttempts: 500, windowSeconds: 60 },
} as const;

async function checkRateLimits(userIdentifier: string, clientIP: string) {
  try {
    const userLimit = await RateLimitCache.checkRateLimit(
      `pack-checkout:${userIdentifier}`,
      RATE_LIMITS.USER.maxAttempts,
      RATE_LIMITS.USER.windowSeconds,
    );
    if (!userLimit.allowed) {
      return { allowed: false, message: 'Too many attempts. Please try again later.' };
    }

    const ipLimit = await RateLimitCache.checkRateLimit(
      `pack-checkout:ip:${clientIP}`,
      RATE_LIMITS.IP.maxAttempts,
      RATE_LIMITS.IP.windowSeconds,
    );
    if (!ipLimit.allowed) {
      return { allowed: false, message: 'Too many attempts from this location.' };
    }

    const globalLimit = await RateLimitCache.checkRateLimit(
      'pack-checkout:global',
      RATE_LIMITS.GLOBAL.maxAttempts,
      RATE_LIMITS.GLOBAL.windowSeconds,
    );
    if (!globalLimit.allowed) {
      return { allowed: false, message: 'System is busy. Please try again shortly.' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limiting error:', error);
    return { allowed: false, message: 'Service temporarily unavailable.' };
  }
}

export async function POST(request: NextRequest) {
  const botResult = (await checkBotId({
    advancedOptions: { checkLevel: 'basic' },
  })) as import('@/types/botid').BotIdVerificationResult;

  if (botResult.isBot) {
    const { COMMON_ALLOWED_BOTS } = await import('@/types/botid');
    const isAllowedBot =
      botResult.isVerifiedBot &&
      botResult.verifiedBotName !== undefined &&
      (COMMON_ALLOWED_BOTS as readonly string[]).includes(botResult.verifiedBotName);

    if (!isAllowedBot) {
      return NextResponse.json(
        { error: 'Access denied', message: 'Automated requests are not allowed' },
        { status: 403 },
      );
    }
  }

  try {
    const body = await request.json();
    const rawPackId = body.packId;
    const rawEmail = body.buyerEmail;
    const rawName = body.buyerName;
    const rawLocale = body.locale;

    if (!rawPackId || !rawEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: packId and buyerEmail' },
        { status: 400 },
      );
    }

    const buyerEmail = String(rawEmail).trim().toLowerCase();
    const buyerName = rawName ? String(rawName).trim() : '';
    const packId = String(rawPackId).trim();
    const locale = ['en', 'pt', 'pt-BR', 'es', 'fr', 'de', 'it'].includes(rawLocale)
      ? rawLocale
      : 'en';

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(packId)) {
      return NextResponse.json({ error: 'Invalid pack ID' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const clientIP =
      forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

    // Stripe-native idempotency: pass the key to Stripe which retains results for 24h
    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim() || null;

    const rateLimitResult = await checkRateLimits(`guest:${buyerEmail}`, clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: rateLimitResult.message }, { status: 429 });
    }

    after(async () => {
      try {
        await Promise.all([
          RateLimitCache.recordAttempt(
            `pack-checkout:guest:${buyerEmail}`,
            RATE_LIMITS.USER.windowSeconds,
          ),
          RateLimitCache.recordAttempt(
            `pack-checkout:ip:${clientIP}`,
            RATE_LIMITS.IP.windowSeconds,
          ),
          RateLimitCache.recordAttempt('pack-checkout:global', RATE_LIMITS.GLOBAL.windowSeconds),
        ]);
      } catch (error) {
        console.error('Error recording rate limit attempts:', error);
      }
    });

    const pack = await db.query.SessionPackTable.findFirst({
      where: eq(SessionPackTable.id, packId),
      with: {
        event: {
          columns: { name: true, slug: true, clerkUserId: true },
        },
        user: {
          columns: {
            stripeConnectAccountId: true,
            stripeConnectChargesEnabled: true,
            firstName: true,
            lastName: true,
            country: true,
          },
        },
      },
    });

    if (!pack || !pack.isActive) {
      return NextResponse.json({ error: 'Session pack not found or inactive' }, { status: 404 });
    }

    if (!pack.stripePriceId) {
      return NextResponse.json({ error: 'Pack is not properly configured' }, { status: 400 });
    }

    if (!pack.user?.stripeConnectAccountId) {
      return NextResponse.json({ error: "Expert's payment account not found" }, { status: 400 });
    }

    if (!pack.user.stripeConnectChargesEnabled) {
      return NextResponse.json(
        {
          error: 'This expert cannot accept payments at this time. Please try again later.',
          code: 'CONNECT_ACCOUNT_NOT_READY',
        },
        { status: 422 },
      );
    }

    const expertStripeAccountId = pack.user.stripeConnectAccountId;
    const expertName =
      `${pack.user.firstName || ''} ${pack.user.lastName || ''}`.trim() || 'Expert';

    const customerId = await getOrCreateStripeCustomer(undefined, buyerEmail, buyerName);

    if (!customerId) {
      return NextResponse.json({ error: 'Failed to create customer record' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eleva.care';
    const applicationFeeAmount = calculateApplicationFee(pack.price);

    const [t] = await Promise.all([getTranslations({ locale, namespace: 'Payments.checkout' })]);

    const termsUrl = `${baseUrl}/${locale}/legal/terms-of-service`;
    const paymentPoliciesUrl = `${baseUrl}/${locale}/legal/payment-policies`;

    const session = await stripe.checkout.sessions.create(
      {
        line_items: [
          {
            price: pack.stripePriceId,
            quantity: 1,
          },
        ],
        custom_fields: [
          {
            key: 'nif',
            label: { type: 'custom', custom: t('nifLabel') },
            type: 'numeric',
            optional: true,
            numeric: { minimum_length: 9, maximum_length: 9 },
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/${locale}/pack-purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/${locale}`,
        customer: customerId,
        customer_creation: customerId ? undefined : 'always',
        // Keep split deterministic: 85/15 is calculated on authoritative listing amount.
        allow_promotion_codes: STRIPE_CONFIG.MARKETPLACE_SPLIT.ALLOW_PROMOTION_CODES,
        automatic_tax: {
          enabled: true,
          liability: { type: 'self' },
        },
        invoice_creation: {
          enabled: true,
          invoice_data: {
            issuer: { type: 'self' },
          },
        },
        tax_id_collection: { enabled: true, required: 'never' },
        billing_address_collection: 'auto',
        consent_collection: { terms_of_service: 'required' },
        custom_text: {
          terms_of_service_acceptance: {
            message: t('termsOfService', { termsUrl, paymentPoliciesUrl }),
          },
        },
        locale: (() => {
          const localeMap: Record<string, Stripe.Checkout.SessionCreateParams.Locale> = {
            en: 'en',
            'pt-BR': 'pt-BR',
            es: 'es',
            fr: 'fr',
            de: 'de',
            it: 'it',
            pt: 'pt-BR',
          };
          return localeMap[locale] || 'en';
        })(),
        customer_update: { name: 'auto', address: 'auto' },
        metadata: {
          type: 'pack_purchase',
          packId: pack.id,
          eventId: pack.eventId,
          eventSlug: pack.event.slug,
          buyerEmail,
          buyerName: buyerName || '',
          sessionsCount: pack.sessionsCount.toString(),
          expertClerkUserId: pack.clerkUserId,
          expertName,
          packName: pack.name,
          eventName: pack.event.name,
          expirationDays: (pack.expirationDays || 180).toString(),
          locale,
        },
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          transfer_data: {
            destination: expertStripeAccountId,
          },
          metadata: {
            type: 'pack_purchase',
            packId: pack.id,
            feeBasis: STRIPE_CONFIG.MARKETPLACE_SPLIT.FEE_BASIS,
          },
        },
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Pack checkout creation failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
