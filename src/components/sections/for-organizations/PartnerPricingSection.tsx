'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Star, Users } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';

interface PricingTier {
  name: string;
  price: string;
  priceDetail?: string;
  annualPrice?: string;
  annualPriceDetail?: string;
  annualSavings?: string;
  teamSize?: string;
  description: string;
  features: string[];
  recommended?: boolean;
  cta: {
    text: string;
    href: string;
  };
}

interface FaqItem {
  question: string;
  answer: string;
}

interface PartnerPricingSectionProps {
  title: string;
  subtitle?: string;
  description?: string;
  tiers: PricingTier[];
  note?: string;
  faq?: FaqItem[];
  faqTitle?: string;
}

export default function PartnerPricingSection({
  title,
  subtitle,
  description,
  tiers,
  note,
  faq,
  faqTitle = 'Frequently Asked Questions',
}: PartnerPricingSectionProps) {
  const hasAnnualPricing = tiers.some((tier) => tier.annualPrice);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  return (
    <section className="bg-muted/30 py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">{title}</h2>
            {subtitle && <p className="text-muted-foreground mb-2 text-lg">{subtitle}</p>}
            {description && (
              <p className="text-muted-foreground mx-auto max-w-3xl text-sm">{description}</p>
            )}
          </div>

          {/* Billing Toggle */}
          {hasAnnualPricing && (
            <div className="mb-8 flex items-center justify-center gap-2">
              <div className="bg-muted inline-flex items-center rounded-full border p-1">
                <button
                  type="button"
                  onClick={() => setBillingPeriod('monthly')}
                  className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
                    billingPeriod === 'monthly'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod('annual')}
                  className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
                    billingPeriod === 'annual'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Annual
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  >
                    Save 2 months
                  </Badge>
                </button>
              </div>
            </div>
          )}

          {/* Pricing Grid */}
          <div className="grid gap-8 md:grid-cols-3">
            {tiers.map((tier, index) => {
              const showAnnual = billingPeriod === 'annual' && tier.annualPrice;
              const displayPrice = showAnnual ? tier.annualPrice : tier.price;
              const displayDetail = showAnnual
                ? tier.annualPriceDetail || '/year'
                : tier.priceDetail;

              return (
                <Card
                  key={index}
                  className={`relative flex flex-col transition-all duration-300 ${tier.recommended ? 'border-primary shadow-xl md:scale-105' : ''}`}
                >
                  {tier.recommended && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary flex items-center gap-1 px-4 py-1 text-sm font-medium">
                        <Star className="h-3 w-3" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-6">
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <CardDescription className="min-h-12">{tier.description}</CardDescription>
                    {tier.teamSize && (
                      <div className="mt-2">
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {tier.teamSize}
                        </Badge>
                      </div>
                    )}

                    <div className="mt-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-bold tracking-tight">{displayPrice}</span>
                        {displayDetail && (
                          <span className="text-muted-foreground text-lg">{displayDetail}</span>
                        )}
                      </div>
                      {showAnnual && tier.annualSavings && (
                        <div className="mt-2">
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          >
                            💰 {tier.annualSavings}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col">
                    <ul className="mb-8 flex-1 space-y-3">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="text-primary mt-0.5 h-5 w-5 shrink-0" />
                          <span className="text-sm leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      asChild
                      className="w-full"
                      variant={tier.recommended ? 'default' : 'outline'}
                      size="lg"
                    >
                      <Link href={tier.cta.href}>{tier.cta.text}</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Revenue Share Info */}
          <div className="bg-card mt-12 rounded-lg border p-6">
            <h3 className="mb-4 text-center text-lg font-semibold">Revenue Share Model</h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <div className="text-primary mb-2 text-3xl font-bold">8-15%</div>
                <div className="text-muted-foreground text-sm">
                  Platform commission on expert bookings
                </div>
              </div>
              <div className="text-center">
                <div className="text-primary mb-2 text-3xl font-bold">Your Choice</div>
                <div className="text-muted-foreground text-sm">
                  Set your own partner marketing fee
                </div>
              </div>
              <div className="text-center">
                <div className="text-primary mb-2 text-3xl font-bold">60%+</div>
                <div className="text-muted-foreground text-sm">
                  Experts always keep at least 60%
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          {faq && faq.length > 0 && (
            <div className="mt-12">
              <h3 className="mb-6 text-center text-lg font-semibold">{faqTitle}</h3>
              <Accordion type="single" collapsible className="mx-auto max-w-3xl">
                {faq.map((item, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left text-sm font-medium">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {/* Note */}
          {note && <p className="text-muted-foreground mt-8 text-center text-sm">{note}</p>}
        </div>
      </div>
    </section>
  );
}
