import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/drizzle/db';
import { EventTable, PackPurchaseTable, SessionPackTable } from '@/drizzle/schema';
import { getCachedUserById } from '@/lib/cache/clerk-cache';
import { getServerStripe } from '@/lib/integrations/stripe/client';
import { eq } from 'drizzle-orm';
import { Calendar, CheckCircle, Gift, Mail, Package, User } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

interface PurchaseDetails {
  packName: string;
  sessionsCount: number;
  eventName: string;
  eventSlug: string;
  expertUsername: string | null;
  expertName: string;
  maxRedemptions: number;
  expiresAt: Date | null;
  buyerEmail: string;
}

/**
 * Fetches purchase details from the database (available after webhook processes).
 * This is the preferred source since it has the full record including promo codes.
 */
async function getDetailsFromDatabase(sessionId: string): Promise<PurchaseDetails | null> {
  const purchase = await db
    .select({
      packName: SessionPackTable.name,
      sessionsCount: SessionPackTable.sessionsCount,
      eventName: EventTable.name,
      eventSlug: EventTable.slug,
      expertClerkUserId: SessionPackTable.clerkUserId,
      maxRedemptions: PackPurchaseTable.maxRedemptions,
      expiresAt: PackPurchaseTable.expiresAt,
      buyerEmail: PackPurchaseTable.buyerEmail,
    })
    .from(PackPurchaseTable)
    .innerJoin(SessionPackTable, eq(PackPurchaseTable.packId, SessionPackTable.id))
    .innerJoin(EventTable, eq(SessionPackTable.eventId, EventTable.id))
    .where(eq(PackPurchaseTable.stripeSessionId, sessionId))
    .limit(1);

  if (purchase.length === 0) return null;

  const row = purchase[0];
  const { expertUsername, expertName } = await resolveExpertInfo(row.expertClerkUserId);

  return { ...row, expertUsername, expertName };
}

/**
 * Falls back to the Stripe checkout session metadata when the webhook hasn't
 * processed yet. This handles the race condition where Stripe redirects the
 * user before the webhook fires.
 */
async function getDetailsFromStripeSession(sessionId: string): Promise<PurchaseDetails | null> {
  try {
    const stripe = await getServerStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const metadata = session.metadata;

    if (!metadata || metadata.type !== 'pack_purchase') return null;

    const expertClerkUserId = metadata.expertClerkUserId;
    const sessionsCount = Number.parseInt(metadata.sessionsCount || '0', 10);
    const expirationDays = Number.parseInt(metadata.expirationDays || '180', 10);

    const expiresAt = new Date(session.created * 1000);
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    const eventSlug = await getEventSlug(metadata.eventId);
    const { expertUsername, expertName } = await resolveExpertInfo(
      expertClerkUserId,
      metadata.expertName,
    );

    return {
      packName: metadata.packName || 'Session Pack',
      sessionsCount,
      eventName: metadata.eventName || 'Session',
      eventSlug: eventSlug || '',
      expertUsername,
      expertName,
      maxRedemptions: sessionsCount,
      expiresAt,
      buyerEmail: metadata.buyerEmail || '',
    };
  } catch {
    return null;
  }
}

async function getEventSlug(eventId: string): Promise<string | null> {
  const event = await db.query.EventTable.findFirst({
    where: eq(EventTable.id, eventId),
    columns: { slug: true },
  });
  return event?.slug ?? null;
}

async function resolveExpertInfo(
  clerkUserId: string,
  fallbackName?: string,
): Promise<{ expertUsername: string | null; expertName: string }> {
  const clerkUser = await getCachedUserById(clerkUserId);
  return {
    expertUsername: clerkUser?.username ?? null,
    expertName:
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') ||
      fallbackName ||
      'Expert',
  };
}

async function getPurchaseDetails(sessionId: string): Promise<PurchaseDetails | null> {
  return (
    (await getDetailsFromDatabase(sessionId)) ?? (await getDetailsFromStripeSession(sessionId))
  );
}

export default async function PackPurchaseSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const { session_id } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'SessionPacks.success' });

  const sessionId = typeof session_id === 'string' ? session_id : null;
  const details = sessionId ? await getPurchaseDetails(sessionId) : null;

  if (!details) {
    return <GenericSuccessPage locale={locale} t={t} />;
  }

  const bookingUrl = details.expertUsername
    ? `/${locale}/${details.expertUsername}/${details.eventSlug}`
    : null;
  const expertProfileUrl = details.expertUsername ? `/${locale}/${details.expertUsername}` : null;

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-16">
      <Card className="mx-auto max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription className="text-base">
            {t('descriptionPersonalized', {
              packName: details.packName,
              expertName: details.expertName,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Purchase summary */}
          <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Package className="text-primary h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">{details.packName}</p>
                <p className="text-muted-foreground text-sm">
                  {t('sessionsIncluded', { count: details.maxRedemptions })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="text-primary h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">{details.eventName}</p>
                <p className="text-muted-foreground text-sm">{t('eventLabel')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="text-primary h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">{details.expertName}</p>
                <p className="text-muted-foreground text-sm">{t('expertLabel')}</p>
              </div>
            </div>

            {details.expiresAt && (
              <div className="mt-2 border-t pt-2">
                <p className="text-muted-foreground text-xs">
                  {t('validUntil', {
                    date: new Date(details.expiresAt).toLocaleDateString(
                      locale.startsWith('pt')
                        ? locale.toLowerCase() === 'pt-br'
                          ? 'pt-BR'
                          : 'pt-PT'
                        : locale.startsWith('es')
                          ? 'es-ES'
                          : 'en-US',
                      { month: 'long', day: 'numeric', year: 'numeric' },
                    ),
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Promo code notice */}
          <div className="border-primary/20 bg-primary/5 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <Gift className="text-primary mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="text-primary font-medium">{t('promoCodeTitle')}</p>
                <p className="text-muted-foreground text-sm">{t('promoCodeDescription')}</p>
              </div>
            </div>
          </div>

          {/* Email notice */}
          <div className="bg-muted/50 text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-3 text-sm">
            <Mail className="h-4 w-4 shrink-0" />
            <span>{t('emailNoticePersonalized')}</span>
          </div>

          {/* Next steps */}
          <div className="space-y-3">
            <h3 className="font-medium">{t('nextSteps')}</h3>
            <ol className="text-muted-foreground space-y-2 text-left text-sm">
              <li className="flex gap-2">
                <Badge
                  variant="outline"
                  className="h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 text-xs font-bold"
                >
                  1
                </Badge>
                <span>{t('step1Personalized')}</span>
              </li>
              <li className="flex gap-2">
                <Badge
                  variant="outline"
                  className="h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 text-xs font-bold"
                >
                  2
                </Badge>
                <span>
                  {t('step2Personalized', {
                    eventName: details.eventName,
                    expertName: details.expertName,
                  })}
                </span>
              </li>
              <li className="flex gap-2">
                <Badge
                  variant="outline"
                  className="h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 text-xs font-bold"
                >
                  3
                </Badge>
                <span>{t('step3Personalized')}</span>
              </li>
            </ol>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            {bookingUrl && (
              <Button asChild className="w-full">
                <Link href={bookingUrl}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {t('bookSession', { eventName: details.eventName })}
                </Link>
              </Button>
            )}
            <Button asChild variant={bookingUrl ? 'outline' : 'default'} className="w-full">
              <Link href={`/${locale}/my-packs?email=${encodeURIComponent(details.buyerEmail)}`}>
                <Package className="mr-2 h-4 w-4" />
                {t('viewMyPacks')}
              </Link>
            </Button>
            {expertProfileUrl && (
              <Button asChild variant="ghost" className="w-full">
                <Link href={expertProfileUrl}>
                  <User className="mr-2 h-4 w-4" />
                  {t('viewExpertProfile', { expertName: details.expertName })}
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GenericSuccessPage({
  locale,
  t,
}: {
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-16">
      <Card className="mx-auto max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription className="text-base">{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg border p-4">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Mail className="h-4 w-4 shrink-0" />
              <span>{t('emailNotice')}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href={`/${locale}/my-packs`}>{t('viewMyPacks')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
