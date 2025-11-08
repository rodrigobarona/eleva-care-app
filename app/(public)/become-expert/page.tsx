/**
 * Become an Expert Landing Page
 *
 * Airbnb-style "Become a Host" page for expert registration.
 * This is the entry point for users who want to become experts on the platform.
 *
 * Flow:
 * 1. User lands on /become-expert
 * 2. Sees benefits, requirements, and CTA
 * 3. Clicks "Get Started" → redirects to /register?expert=true
 * 4. After registration → auto-creates expert_individual organization
 * 5. Redirects to /setup for guided expert onboarding
 */
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import Link from 'next/link';

export default async function BecomeExpertPage() {
  // This is a public page - no authentication required
  // Users can view the landing page whether they're logged in or not
  // If they click "Get Started", they'll be redirected to /register?expert=true

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Hero Section */}
      <section className="container relative mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-block rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="mr-2 inline h-4 w-4" />
            Start Your Expert Journey
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Share Your Expertise,
            <br />
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Earn on Your Schedule
            </span>
          </h1>

          <p className="mb-8 text-lg text-muted-foreground md:text-xl">
            Join our community of healthcare professionals, coaches, and consultants. Set your own
            rates, manage your schedule, and help people achieve their goals.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="text-lg">
              <Link href="/register?expert=true">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg">
              <Link href="/login">Already an Expert? Sign In</Link>
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Free to join • No hidden fees • Get paid directly
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold">Why Join Eleva Care?</h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Set Your Own Rates</h3>
                <p className="text-muted-foreground">
                  You decide how much you charge. Keep 80% of your earnings, with transparent fees.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <CalendarCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Flexible Scheduling</h3>
                <p className="text-muted-foreground">
                  Integrate with your Google Calendar. Set your availability and let clients book
                  when it works for you.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Grow Your Client Base</h3>
                <p className="text-muted-foreground">
                  Get discovered by clients actively searching for your expertise. No cold outreach
                  needed.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Virtual Consultations</h3>
                <p className="text-muted-foreground">
                  Meet clients anywhere with integrated Google Meet. No need for third-party tools.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Secure Payments</h3>
                <p className="text-muted-foreground">
                  Get paid automatically through Stripe. Direct deposit to your bank account.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">Built-in Marketing</h3>
                <p className="text-muted-foreground">
                  Get featured in search results, email reminders, and our expert directory.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>

            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  1
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold">Create Your Profile</h3>
                  <p className="text-muted-foreground">
                    Tell us about your expertise, credentials, and what makes you unique. Upload a
                    professional photo and set your hourly rate.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  2
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold">Set Your Availability</h3>
                  <p className="text-muted-foreground">
                    Connect your Google Calendar and set your working hours. Our smart booking
                    system handles the rest.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  3
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold">Verify Your Identity</h3>
                  <p className="text-muted-foreground">
                    Complete a quick identity verification for client trust and secure payments.
                    Takes less than 5 minutes.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  4
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold">Start Consulting</h3>
                  <p className="text-muted-foreground">
                    Once approved, clients can book you immediately. Get notified, meet virtually,
                    and get paid automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Button asChild size="lg" className="text-lg">
                <Link href="/register?expert=true">
                  Start Your Journey <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-3xl font-bold">What You Need to Get Started</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-start gap-4">
              <BadgeCheck className="mt-1 h-6 w-6 text-primary" />
              <div>
                <h3 className="mb-1 font-semibold">Professional Credentials</h3>
                <p className="text-sm text-muted-foreground">
                  Valid certifications, licenses, or proven expertise in your field
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Globe className="mt-1 h-6 w-6 text-primary" />
              <div>
                <h3 className="mb-1 font-semibold">Reliable Internet</h3>
                <p className="text-sm text-muted-foreground">
                  Stable connection for video consultations
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <MessageSquare className="mt-1 h-6 w-6 text-primary" />
              <div>
                <h3 className="mb-1 font-semibold">Communication Skills</h3>
                <p className="text-sm text-muted-foreground">
                  Ability to clearly explain concepts and answer questions
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Heart className="mt-1 h-6 w-6 text-primary" />
              <div>
                <h3 className="mb-1 font-semibold">Passion for Helping</h3>
                <p className="text-sm text-muted-foreground">
                  Genuine desire to help others achieve their goals
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
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Ready to Share Your Expertise?</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join thousands of experts earning on their own terms. Set up takes less than 15
              minutes.
            </p>
            <Button asChild size="lg" className="text-lg">
              <Link href="/register?expert=true">
                Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Questions?{' '}
              <Link href="/support" className="text-primary hover:underline">
                Contact our team
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
