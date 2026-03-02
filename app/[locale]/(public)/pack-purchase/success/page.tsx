import { ConfettiCelebration } from '@/components/shared/success/ConfettiCelebration';
import { ExpertPortraitCard } from '@/components/shared/success/ExpertPortraitCard';
import { StepList } from '@/components/shared/success/StepList';
import { SupportFooter } from '@/components/shared/success/SupportFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { getCachedUserById } from '@/lib/cache/clerk-cache';
import { Badge, CheckCircle, Gift, Mail, Package } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Stripe from 'stripe';

interface PurchaseDetails {
  packName: string;
  eventName: string;
  sessionsCount: number;
  expertName: string;
  expertUsername?: string;
  expertClerkUserId?: string;
  eventSlug?: string;
  expiresAt?: Date;
  promotionCode?: string;
  expertImage?: string;
  expertHeadline?: string;
  expertCategory?: string;
  isTopExpert?: boolean;
  isVerified?: boolean;
}

async function getDetailsFromDatabase(sessionId: string): Promise<PurchaseDetails | null> {
  const purchase = await db.query.PackPurchaseTable.findFirst({
    where: ({ stripeSessionId }, { eq }) => eq(stripeSessionId, sessionId),
    with: {
      pack: {
        with: {
          event: true,
        },
      },
    },
  });

  if (!purchase) return null;

  const expertProfile = await db.query.ProfileTable.findFirst({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, purchase.pack.clerkUserId),
    with: { primaryCategory: true },
  });

  const clerkUser = await getCachedUserById(purchase.pack.clerkUserId);
  const username = clerkUser?.username ?? undefined;

  return {
    packName: purchase.pack.name,
    eventName: purchase.pack.event.name,
    sessionsCount: purchase.maxRedemptions,
    expertName: expertProfile
      ? `${expertProfile.firstName} ${expertProfile.lastName}`
      : (clerkUser?.fullName ?? 'Expert'),
    expertUsername: username,
    expertClerkUserId: purchase.pack.clerkUserId,
    eventSlug: purchase.pack.event.slug,
    expiresAt: purchase.expiresAt ?? undefined,
    promotionCode: purchase.promotionCode,
    expertImage: expertProfile?.profilePicture ?? clerkUser?.imageUrl ?? undefined,
    expertHeadline: expertProfile?.headline ?? undefined,
    expertCategory: expertProfile?.primaryCategory?.name ?? undefined,
    isTopExpert: expertProfile?.isTopExpert ?? false,
    isVerified: expertProfile?.isVerified ?? false,
  };
}

async function getDetailsFromStripeSession(sessionId: string): Promise<PurchaseDetails | null> {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
    });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid' || session.metadata?.type !== 'pack_purchase') {
      return null;
    }

    const meta = session.metadata;
    const expertClerkUserId = meta.expertClerkUserId;

    let expertImage: string | undefined;
    let expertHeadline: string | undefined;
    let expertCategory: string | undefined;
    let isTopExpert = false;
    let isVerified = false;
    let expertUsername: string | undefined;
    let resolvedExpertName = meta.expertName || 'Expert';

    if (expertClerkUserId) {
      const [expertProfile, clerkUser] = await Promise.all([
        db.query.ProfileTable.findFirst({
          where: ({ clerkUserId }, { eq }) => eq(clerkUserId, expertClerkUserId),
          with: { primaryCategory: true },
        }),
        getCachedUserById(expertClerkUserId),
      ]);

      expertImage = expertProfile?.profilePicture ?? clerkUser?.imageUrl ?? undefined;
      expertHeadline = expertProfile?.headline ?? undefined;
      expertCategory = expertProfile?.primaryCategory?.name ?? undefined;
      isTopExpert = expertProfile?.isTopExpert ?? false;
      isVerified = expertProfile?.isVerified ?? false;
      expertUsername = clerkUser?.username ?? undefined;
      if (expertProfile) {
        resolvedExpertName = `${expertProfile.firstName} ${expertProfile.lastName}`;
      }
    }

    const expirationDays = Number.parseInt(meta.expirationDays || '180', 10);
    const expiresAt = new Date(session.created * 1000);
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    return {
      packName: meta.packName || 'Session Pack',
      eventName: meta.eventName || 'Session',
      sessionsCount: Number.parseInt(meta.sessionsCount || '0', 10),
      expertName: resolvedExpertName,
      expertUsername,
      expertClerkUserId: expertClerkUserId ?? undefined,
      eventSlug: undefined,
      expiresAt,
      expertImage,
      expertHeadline,
      expertCategory,
      isTopExpert,
      isVerified,
    };
  } catch (error) {
    console.error('Failed to retrieve Stripe session for pack success page:', error);
    return null;
  }
}

export default async function PackPurchaseSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { locale } = await params;
  const { session_id } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'SessionPacks.success' });
  const tExperts = await getTranslations({ locale, namespace: 'experts' });

  if (!session_id || !session_id.startsWith('cs_')) {
    return <GenericSuccessPage locale={locale} />;
  }

  const details =
    (await getDetailsFromDatabase(session_id)) ?? (await getDetailsFromStripeSession(session_id));

  if (!details) {
    return <GenericSuccessPage locale={locale} />;
  }

  const eventBookingUrl =
    details.expertUsername && details.eventSlug
      ? `/${locale}/${details.expertUsername}/${details.eventSlug}`
      : details.expertUsername
        ? `/${locale}/${details.expertUsername}`
        : null;

  return (
    <div className="bg-background min-h-[60vh] px-4 py-12 sm:px-6 lg:px-8">
      <ConfettiCelebration />
      <div className="mx-auto w-full max-w-4xl">
        {/* Success Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-foreground font-serif text-3xl font-light sm:text-4xl">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            {t('descriptionPersonalized', {
              packName: details.packName,
              sessionsCount: details.sessionsCount,
              expertName: details.expertName,
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Expert Portrait Card */}
          {details.expertImage && (
            <div className="lg:col-span-1">
              <ExpertPortraitCard
                imageUrl={details.expertImage}
                name={details.expertName}
                headline={details.expertHeadline}
                category={details.expertCategory}
                isTopExpert={details.isTopExpert}
                isVerified={details.isVerified}
                topExpertLabel={tExperts('topExpertBadge')}
                verifiedBadgeAlt={tExperts('verifiedBadgeAlt')}
                profileUrl={
                  details.expertUsername ? `/${locale}/${details.expertUsername}` : undefined
                }
              />
            </div>
          )}

          {/* Content Column */}
          <div className={`space-y-6 ${details.expertImage ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {/* Purchase Summary */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 font-serif text-xl font-light">
                  <Package className="h-5 w-5" />
                  {details.packName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('eventLabel')}</span>
                  <span className="text-foreground font-medium">{details.eventName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('expertLabel')}</span>
                  <span className="text-foreground font-medium">{details.expertName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('sessionsIncluded', { count: details.sessionsCount })}
                  </span>
                  <Badge className="text-eleva-primary h-5 w-5" />
                </div>
                {details.expiresAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('validUntil', {
                        date: new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(
                          details.expiresAt,
                        ),
                      })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Promo Code Callout */}
            <div className="border-eleva-primary/20 bg-eleva-primary/5 rounded-lg border p-5">
              <div className="flex items-start gap-3">
                <Gift className="text-eleva-primary mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <h3 className="text-foreground font-medium">{t('promoCodeTitle')}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">{t('promoCodeDescription')}</p>
                </div>
              </div>
            </div>

            {/* Email Notice */}
            <div className="bg-muted/50 rounded-lg border p-4">
              <div className="text-muted-foreground flex items-center gap-3 text-sm">
                <Mail className="h-5 w-5 shrink-0" />
                <span>{t('emailNoticePersonalized', { eventName: details.eventName })}</span>
              </div>
            </div>

            {/* Next Steps */}
            <StepList
              title={t('nextSteps')}
              steps={[
                t('step1Personalized'),
                t('step2Personalized', {
                  expertName: details.expertName,
                  eventName: details.eventName,
                }),
                t('step3Personalized'),
              ]}
            />

            {/* CTAs */}
            <div className="flex flex-col gap-3 sm:flex-row">
              {eventBookingUrl && (
                <Button asChild className="flex-1">
                  <Link href={eventBookingUrl}>
                    {t('bookSession', { eventName: details.eventName })}
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="flex-1">
                <Link href={`/${locale}/my-packs`}>{t('viewMyPacks')}</Link>
              </Button>
              {details.expertUsername && (
                <Button asChild variant="ghost" className="flex-1">
                  <Link href={`/${locale}/${details.expertUsername}`}>
                    {t('viewExpertProfile', { expertName: details.expertName })}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <SupportFooter text={t('supportText')} />
      </div>
    </div>
  );
}

async function GenericSuccessPage({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'SessionPacks.success' });

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-16">
      <div className="mx-auto max-w-lg text-center">
        <div className="mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-foreground text-2xl font-semibold">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('description')}</p>
        </div>

        <div className="bg-muted/50 mb-6 rounded-lg border p-4">
          <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
            <Mail className="h-4 w-4 shrink-0" />
            <span>{t('emailNotice')}</span>
          </div>
        </div>

        <StepList title={t('nextSteps')} steps={[t('step1'), t('step2'), t('step3'), t('step4')]} />

        <div className="mt-6 flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href={`/${locale}/my-packs`}>{t('viewMyPacks')}</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/${locale}`}>{t('browseExperts')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
