'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Info } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';

type BillingInterval = 'monthly' | 'annual';

interface PricingData {
  monthly: {
    price: string;
    priceDetail: string;
  };
  annual: {
    price: string;
    priceDetail: string;
    savings: string;
  };
}

interface TierPricing {
  tierName: string;
  tierBadge?: string;
  tierIcon: React.ReactNode;
  tierColor: 'primary' | 'amber';
  description: string;
  pricing: PricingData;
  commission: string;
  features: string[];
  recommended?: boolean;
  requirements?: string[];
  cta: {
    text: string;
    href: string;
  };
}

interface ExpertPricingSectionProps {
  title: string;
  subtitle?: string;
  communityTier: TierPricing;
  topTier: TierPricing;
  note?: string;
  toggleLabels: {
    monthly: string;
    annual: string;
    saveText: string; // e.g., "Save 20%"
  };
}

export default function ExpertPricingSection({
  title,
  subtitle,
  communityTier,
  topTier,
  note,
  toggleLabels,
}: ExpertPricingSectionProps) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('annual');

  return (
    <section className="bg-muted/30 py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">{title}</h2>
            {subtitle && (
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{subtitle}</p>
            )}
          </div>

          {/* Billing Toggle */}
          <div className="mb-12 flex justify-center">
            <div className="inline-flex items-center gap-3 rounded-full border bg-background p-1 shadow-sm">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`rounded-full px-6 py-2 text-sm font-medium transition-all ${
                  billingInterval === 'monthly'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {toggleLabels.monthly}
              </button>
              <button
                onClick={() => setBillingInterval('annual')}
                className={`flex items-center gap-2 rounded-full px-6 py-2 text-sm font-medium transition-all ${
                  billingInterval === 'annual'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {toggleLabels.annual}
                <Badge variant="secondary" className="bg-green-500 text-white hover:bg-green-600">
                  {toggleLabels.saveText}
                </Badge>
              </button>
            </div>
          </div>

          {/* Pricing Cards - Side by Side */}
          <div className="mb-12 grid gap-8 md:grid-cols-2">
            <TierCard tier={communityTier} billingInterval={billingInterval} />
            <TierCard tier={topTier} billingInterval={billingInterval} />
          </div>

          {/* Note */}
          {note && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-center text-sm text-muted-foreground">{note}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TierCard({
  tier,
  billingInterval,
}: {
  tier: TierPricing;
  billingInterval: BillingInterval;
}) {
  const colorClasses = {
    primary: {
      icon: 'text-primary',
      badge: 'border-primary/20 bg-primary/5',
      card: 'border-primary shadow-xl ring-2 ring-primary/20',
      check: 'text-primary',
      savings: 'bg-primary text-white',
    },
    amber: {
      icon: 'text-amber-500',
      badge: 'border-amber-500/20 bg-amber-500/5',
      card: 'border-amber-500 shadow-xl ring-2 ring-amber-500/20',
      check: 'text-amber-500',
      savings: 'bg-amber-500 text-white',
    },
  };

  const colors = colorClasses[tier.tierColor];
  const currentPricing = billingInterval === 'monthly' ? tier.pricing.monthly : tier.pricing.annual;
  const showSavings = billingInterval === 'annual';

  return (
    <Card
      className={`relative flex flex-col transition-all duration-300 ${tier.recommended ? colors.card : 'border-muted hover:border-primary/50'}`}
    >
      {/* Recommended Badge */}
      {tier.recommended && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge
            className="px-4 py-1 text-sm font-medium"
            style={{
              backgroundColor: tier.tierColor === 'amber' ? '#f59e0b' : undefined,
            }}
          >
            ⭐ Recommended
          </Badge>
        </div>
      )}

      <CardHeader className="pb-6">
        {/* Tier Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className={`${colors.icon} text-2xl`}>{tier.tierIcon}</div>
          <div className="flex-1">
            <CardTitle className="text-2xl">{tier.tierName}</CardTitle>
            {tier.tierBadge && (
              <Badge variant="secondary" className="mt-1">
                {tier.tierBadge}
              </Badge>
            )}
          </div>
        </div>

        <CardDescription className="text-base">{tier.description}</CardDescription>

        {/* Pricing Display */}
        <div className="mt-6 space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold tracking-tight">{currentPricing.price}</span>
            <span className="text-lg text-muted-foreground">{currentPricing.priceDetail}</span>
          </div>

          {/* Savings Badge */}
          {showSavings && tier.pricing.annual.savings && (
            <div
              className={`inline-flex items-center gap-2 rounded-full ${colors.savings} px-4 py-1.5 text-sm font-semibold`}
            >
              <Check className="h-4 w-4" />
              {tier.pricing.annual.savings}
            </div>
          )}

          {/* Commission Rate */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Commission per booking:</span>
              <span
                className={`text-xl font-bold ${tier.tierColor === 'amber' ? 'text-amber-500' : 'text-primary'}`}
              >
                {tier.commission}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col space-y-6">
        {/* Requirements (Top Expert Only) */}
        {tier.requirements && tier.requirements.length > 0 && (
          <Card className={colors.badge}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className={`h-4 w-4 ${colors.icon}`} />
                How to Qualify
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tier.requirements.map((req, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <Check className={`mt-0.5 h-4 w-4 shrink-0 ${colors.check}`} />
                  <span>{req}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="flex-1">
          <h4 className="mb-3 font-semibold">What&apos;s included:</h4>
          <ul className="space-y-3">
            {tier.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Check className={`mt-0.5 h-5 w-5 shrink-0 ${colors.check}`} />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
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
}
