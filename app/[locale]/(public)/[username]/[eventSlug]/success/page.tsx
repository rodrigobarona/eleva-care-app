import { getProfileAccessData, ProfileAccessControl } from '@/components/auth/ProfileAccessControl';
import { ConfettiCelebration } from '@/components/shared/success/ConfettiCelebration';
import { ExpertPortraitCard } from '@/components/shared/success/ExpertPortraitCard';
import { PaymentProcessingPoller } from '@/components/shared/success/PaymentProcessingPoller';
import { StepList } from '@/components/shared/success/StepList';
import { SupportFooter } from '@/components/shared/success/SupportFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { getCachedUserById } from '@/lib/cache/clerk-cache';
import { formatDateTime } from '@/lib/utils/formatters';
import { Calendar, CheckCircle, Clock, CreditCard, Mail, User } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Stripe from 'stripe';

interface PageProps {
  params: Promise<{
    username: string;
    eventSlug: string;
    locale: string;
  }>;
  searchParams: Promise<{
    startTime: string;
    session_id?: string;
    timezone?: string;
  }>;
}

export default async function SuccessPage(props: PageProps) {
  const params = await props.params;
  const { username, eventSlug } = params;

  return (
    <ProfileAccessControl username={username} context="SuccessPage" additionalPath={eventSlug}>
      <SuccessPageContent props={props} />
    </ProfileAccessControl>
  );
}

async function SuccessPageContent({ props }: { props: PageProps }) {
  const t = await getTranslations('BookingSuccess');
  const tExperts = await getTranslations('experts');

  const params = await props.params;
  const searchParams = await props.searchParams;

  const { startTime, session_id, timezone } = searchParams;

  const cookieStore = await cookies();
  const userTimezone = timezone || cookieStore.get('user-timezone')?.value || 'UTC';

  const { username, eventSlug, locale } = params;

  const data = await getProfileAccessData(username);
  if (!data) {
    return notFound();
  }

  const { user } = data;

  const event = await db.query.EventTable.findFirst({
    where: ({ clerkUserId: userIdCol, isActive, slug }, { eq, and }) =>
      and(eq(isActive, true), eq(userIdCol, user.id), eq(slug, eventSlug)),
  });

  if (event == null) notFound();

  const expertProfile = await db.query.ProfileTable.findFirst({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, user.id),
    with: {
      primaryCategory: true,
    },
  });

  const calendarUser = await getCachedUserById(user.id);

  if (!calendarUser) {
    return notFound();
  }

  // When redirected from Stripe checkout, startTime may be absent — look up
  // the meeting by session_id first, then fall back to startTime from the URL.
  let meeting;
  if (session_id) {
    meeting = await db.query.MeetingTable.findFirst({
      where: ({ eventId, stripeSessionId }, { eq, and }) =>
        and(eq(eventId, event.id), eq(stripeSessionId, session_id)),
    });
  }

  let startTimeDate: Date;
  if (meeting) {
    startTimeDate = new Date(meeting.startTime);
  } else if (startTime) {
    try {
      startTimeDate = new Date(startTime);
      if (Number.isNaN(startTimeDate.getTime())) throw new Error('Invalid date');
    } catch (error) {
      console.error('Invalid startTime:', startTime, error);
      return notFound();
    }

    meeting = await db.query.MeetingTable.findFirst({
      where: ({ eventId, startTime: meetingStartTime }, { eq, and }) =>
        and(eq(eventId, event.id), eq(meetingStartTime, startTimeDate)),
    });
  } else {
    console.error('No startTime or session_id provided');
    return notFound();
  }

  const expertName = expertProfile
    ? `${expertProfile.firstName} ${expertProfile.lastName}`
    : calendarUser.fullName;
  const expertImage = expertProfile?.profilePicture || calendarUser.imageUrl;

  if (meeting) {
    const displayTimezone = meeting.timezone || userTimezone;

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
            <p className="text-muted-foreground mt-2 text-lg">{t('subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Expert Portrait Card */}
            <div className="lg:col-span-1">
              <ExpertPortraitCard
                imageUrl={expertImage}
                name={expertName || 'Expert'}
                headline={expertProfile?.headline ?? undefined}
                category={expertProfile?.primaryCategory?.name ?? undefined}
                isTopExpert={expertProfile?.isTopExpert ?? false}
                isVerified={expertProfile?.isVerified ?? false}
                topExpertLabel={tExperts('topExpertBadge')}
                verifiedBadgeAlt={tExperts('verifiedBadgeAlt')}
                profileUrl={`/${username}`}
              />
            </div>

            {/* Content Column */}
            <div className="space-y-6 lg:col-span-2">
              {/* Booking Details */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="font-serif text-xl font-light">
                    {t('bookingDetails')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-start space-x-3">
                    <User className="text-muted-foreground mt-0.5 h-5 w-5" />
                    <div>
                      <h4 className="text-foreground font-medium">{event.name}</h4>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {t('durationMinutes', { duration: event.durationInMinutes })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Calendar className="text-muted-foreground mt-0.5 h-5 w-5" />
                    <div>
                      <h4 className="text-foreground font-medium">
                        {formatDateTime(startTimeDate, displayTimezone)}
                      </h4>
                      <p className="text-muted-foreground flex items-center gap-1 text-sm">
                        <Clock className="h-3.5 w-3.5" />
                        {displayTimezone.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>

                  {event.price > 0 && (
                    <div className="flex items-start space-x-3">
                      <CreditCard className="text-muted-foreground mt-0.5 h-5 w-5" />
                      <div>
                        <h4 className="text-foreground font-medium">
                          &euro;{(event.price / 100).toFixed(2)} EUR
                        </h4>
                        <p className="text-muted-foreground text-sm">{t('paymentConfirmed')}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Email Notice */}
              <div className="bg-muted/50 rounded-lg border p-4">
                <div className="text-muted-foreground flex items-center gap-3 text-sm">
                  <Mail className="h-5 w-5 shrink-0" />
                  <span>{t('emailNotice')}</span>
                </div>
              </div>

              {/* Next Steps */}
              <StepList
                title={t('nextStepsTitle')}
                steps={[t('step1'), t('step2', { expertName: expertName || '' }), t('step3')]}
              />

              {/* CTAs */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="flex-1">
                  <Link href={`/${locale}/${username}/${eventSlug}`}>{t('bookAnother')}</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/${locale}`}>{t('returnHome')}</Link>
                </Button>
              </div>
            </div>
          </div>

          <SupportFooter text={t('supportText')} />
        </div>
      </div>
    );
  }

  // Paid event but no meeting found — check the session status
  if (event.price > 0 && session_id) {
    if (typeof session_id !== 'string' || !session_id.startsWith('cs_')) {
      console.error('Invalid session ID format:', session_id);
      return notFound();
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
    });

    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status === 'paid') {
        return (
          <div className="bg-background min-h-[60vh] px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <div className="mb-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <Clock className="h-10 w-10 animate-spin text-blue-600" />
                </div>
                <h1 className="text-foreground font-serif text-3xl font-light sm:text-4xl">
                  {t('processingTitle')}
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">{t('processingSubtitle')}</p>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <ExpertPortraitCard
                    imageUrl={expertImage}
                    name={expertName || 'Expert'}
                    headline={expertProfile?.headline ?? undefined}
                    category={expertProfile?.primaryCategory?.name ?? undefined}
                    isTopExpert={expertProfile?.isTopExpert ?? false}
                    isVerified={expertProfile?.isVerified ?? false}
                    topExpertLabel={tExperts('topExpertBadge')}
                    verifiedBadgeAlt={tExperts('verifiedBadgeAlt')}
                    profileUrl={`/${username}`}
                  />
                </div>

                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="font-serif text-xl font-light">
                        {t('creatingBooking')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="flex items-start space-x-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <p className="text-muted-foreground text-sm">{t('paymentConfirmedStep')}</p>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                        <p className="text-muted-foreground text-sm">{t('settingUpMeeting')}</p>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="border-muted h-6 w-6 rounded-full border-2" />
                        <p className="text-muted-foreground/60 text-sm">
                          {t('sendingConfirmation')}
                        </p>
                      </div>

                      <div className="mt-6 rounded-lg bg-blue-50 p-4">
                        <p className="text-sm text-blue-800">
                          <strong>{t('pleaseWait')}</strong>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <PaymentProcessingPoller />
            </div>
          </div>
        );
      }

      if (session.payment_status === 'unpaid') {
        return (
          <div className="bg-background min-h-[60vh] px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <div className="mb-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                  <Clock className="h-10 w-10 animate-pulse text-yellow-600" />
                </div>
                <h1 className="text-foreground font-serif text-3xl font-light sm:text-4xl">
                  {t('processingPayment')}
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  {t('processingPaymentSubtitle')}
                </p>
              </div>

              <div className="mx-auto max-w-2xl">
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="space-y-4">
                      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent" />
                      <p className="text-muted-foreground">{t('paymentProcessing')}</p>
                      <p className="text-muted-foreground/70 text-sm">{t('autoRefresh')}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <PaymentProcessingPoller />
            </div>
          </div>
        );
      }

      console.error('Unexpected payment status:', session.payment_status);
      redirect(`/${locale}/${username}/${eventSlug}/book?error=payment-failed`);
    } catch (error) {
      console.error('Error retrieving session:', error);
      redirect(`/${locale}/${username}/${eventSlug}/book?error=payment-error`);
    }
  }

  if (event.price > 0) {
    redirect(`/${locale}/${username}/${eventSlug}/book?error=payment-incomplete`);
  }

  redirect(`/${locale}/${username}/${eventSlug}/book?error=meeting-not-created`);
}
