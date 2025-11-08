/**
 * Become an Expert Landing Page (Multilingual)
 *
 * Airbnb-style "Become a Host" page for expert registration.
 * This is the entry point for users who want to become experts on the platform.
 *
 * Flow:
 * 1. User lands on /become-expert (or /[locale]/become-expert)
 * 2. Sees benefits, requirements, and CTA in their language
 * 3. Clicks "Get Started" → redirects to /register?expert=true
 * 4. After registration → auto-creates expert_individual organization
 * 5. Redirects to /setup for guided expert onboarding
 */
import { isValidLocale } from '@/app/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { locales } from '@/lib/i18n/routing';
import { generateGenericPageMetadata } from '@/lib/seo/metadata-utils';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  DollarSign,
  Globe,
  Heart,
  MessageSquare,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

// Static marketing page - cache for 24 hours
export const revalidate = 86400;

// Define the page props
interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  // Use default locale for metadata if invalid (page component handles redirect)
  const safeLocale = isValidLocale(locale) ? locale : 'en';

  try {
    const t = await getTranslations({ locale: safeLocale, namespace: 'metadata.become-expert' });

    return generateGenericPageMetadata(
      safeLocale,
      '/become-expert',
      t('title'),
      t('description'),
      'primary', // Use primary variant for CTA page
      [
        'become an expert',
        'expert registration',
        'healthcare professional',
        'consultant',
        'coach',
        'earn money',
      ],
    );
  } catch (error) {
    console.error('Error generating metadata:', error);

    return generateGenericPageMetadata(
      safeLocale,
      '/become-expert',
      'Become an Expert - Share Your Knowledge',
      'Join our community of healthcare professionals, coaches, and consultants. Set your own rates and earn on your schedule.',
      'primary',
      [
        'become an expert',
        'expert registration',
        'healthcare professional',
        'consultant',
        'coach',
        'earn money',
      ],
    );
  }
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function BecomeExpertPage({ params }: PageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    redirect('/become-expert'); // Default locale (en) has no prefix
  }

  // Get translations for this page
  const t = await getTranslations({ locale, namespace: 'become-expert' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Hero Section */}
      <section className="container relative mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-block rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="mr-2 inline h-4 w-4" />
            {t('hero.badge')}
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            {t('hero.title')}
            <br />
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('hero.subtitle')}
            </span>
          </h1>

          <p className="mb-8 text-lg text-muted-foreground md:text-xl">{t('hero.description')}</p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="text-lg">
              <Link href="/register?expert=true">
                {t('hero.cta')} <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg">
              <Link href="/login">{t('hero.signin')}</Link>
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">{t('hero.features')}</p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold">{t('benefits.title')}</h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{t('benefits.rates.title')}</h3>
                <p className="text-muted-foreground">{t('benefits.rates.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <CalendarCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{t('benefits.scheduling.title')}</h3>
                <p className="text-muted-foreground">{t('benefits.scheduling.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{t('benefits.clients.title')}</h3>
                <p className="text-muted-foreground">{t('benefits.clients.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{t('benefits.virtual.title')}</h3>
                <p className="text-muted-foreground">{t('benefits.virtual.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{t('benefits.payments.title')}</h3>
                <p className="text-muted-foreground">{t('benefits.payments.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{t('benefits.marketing.title')}</h3>
                <p className="text-muted-foreground">{t('benefits.marketing.description')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-12 text-center text-3xl font-bold">{t('how.title')}</h2>

            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  1
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold">{t('how.step1.title')}</h3>
                  <p className="text-muted-foreground">{t('how.step1.description')}</p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  2
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold">{t('how.step2.title')}</h3>
                  <p className="text-muted-foreground">{t('how.step2.description')}</p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  3
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold">{t('how.step3.title')}</h3>
                  <p className="text-muted-foreground">{t('how.step3.description')}</p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  4
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold">{t('how.step4.title')}</h3>
                  <p className="text-muted-foreground">{t('how.step4.description')}</p>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Button asChild size="lg" className="text-lg">
                <Link href="/register?expert=true">
                  {t('how.cta')} <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-3xl font-bold">{t('requirements.title')}</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-start gap-4">
              <BadgeCheck className="mt-1 h-6 w-6 text-primary" />
              <div>
                <h3 className="mb-1 font-semibold">{t('requirements.credentials.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('requirements.credentials.description')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Globe className="mt-1 h-6 w-6 text-primary" />
              <div>
                <h3 className="mb-1 font-semibold">{t('requirements.internet.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('requirements.internet.description')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <MessageSquare className="mt-1 h-6 w-6 text-primary" />
              <div>
                <h3 className="mb-1 font-semibold">{t('requirements.communication.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('requirements.communication.description')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Heart className="mt-1 h-6 w-6 text-primary" />
              <div>
                <h3 className="mb-1 font-semibold">{t('requirements.passion.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('requirements.passion.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <Zap className="mx-auto mb-6 h-16 w-16 text-primary" />
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">{t('cta.title')}</h2>
            <p className="mb-8 text-lg text-muted-foreground">{t('cta.description')}</p>
            <Button asChild size="lg" className="text-lg">
              <Link href="/register?expert=true">
                {t('cta.button')} <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              {t('cta.questions')}{' '}
              <Link href="/support" className="text-primary hover:underline">
                {t('cta.contact')}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
