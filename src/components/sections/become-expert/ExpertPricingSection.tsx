import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Info } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

interface PricingPlan {
  name: string;
  price: string;
  priceDetail: string;
  commission: string;
  badge?: string;
  description: string;
  features: string[];
  recommended?: boolean;
  savingsText?: string;
  cta: {
    text: string;
    href: string;
  };
}

interface TierPricing {
  tierName: string;
  tierBadge?: string;
  tierIcon: React.ReactNode;
  tierColor: 'primary' | 'amber';
  description: string;
  plans: PricingPlan[];
  requirements?: string[];
}

interface ExpertPricingSectionProps {
  title: string;
  subtitle?: string;
  communityTier: TierPricing;
  topTier: TierPricing;
  note?: string;
}

export default function ExpertPricingSection({
  title,
  subtitle,
  communityTier,
  topTier,
  note,
}: ExpertPricingSectionProps) {
  return (
    <section className="bg-muted/30 py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">{title}</h2>
            {subtitle && (
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{subtitle}</p>
            )}
          </div>

          {/* Community Expert Section */}
          <TierSection tier={communityTier} />

          {/* Divider */}
          <div className="my-16 border-t" />

          {/* Top Expert Section */}
          <TierSection tier={topTier} />

          {/* Note */}
          {note && <p className="mt-12 text-center text-sm text-muted-foreground">{note}</p>}
        </div>
      </div>
    </section>
  );
}

function TierSection({ tier }: { tier: TierPricing }) {
  const colorClasses = {
    primary: {
      icon: 'text-primary',
      badge: 'border-primary/20 bg-primary/5',
      card: 'border-primary shadow-lg',
      check: 'text-primary',
      savings: 'bg-primary',
    },
    amber: {
      icon: 'text-amber-500',
      badge: 'border-amber-500/20 bg-amber-500/5',
      card: 'border-amber-500 shadow-lg',
      check: 'text-amber-500',
      savings: 'bg-amber-500',
    },
  };

  const colors = colorClasses[tier.tierColor];

  return (
    <div>
      {/* Tier Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className={colors.icon}>{tier.tierIcon}</div>
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold">{tier.tierName}</h3>
            {tier.tierBadge && (
              <Badge variant="secondary" className="ml-2">
                {tier.tierBadge}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{tier.description}</p>
        </div>
      </div>

      {/* Requirements (if Top Expert) */}
      {tier.requirements && tier.requirements.length > 0 && (
        <Card className={`mb-6 ${colors.badge}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className={`h-5 w-5 ${colors.icon}`} />
              How to Qualify
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {tier.requirements.map((req, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className={`mt-0.5 h-4 w-4 shrink-0 ${colors.check}`} />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Pricing Plans Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {tier.plans.map((plan, index) => (
          <Card
            key={index}
            className={`relative flex flex-col ${plan.recommended ? colors.card : ''}`}
          >
            {plan.badge && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge
                  className="px-4 py-1 text-sm font-medium"
                  style={
                    plan.recommended
                      ? { backgroundColor: tier.tierColor === 'amber' ? '#f59e0b' : undefined }
                      : undefined
                  }
                >
                  {plan.badge}
                </Badge>
              </div>
            )}

            <CardHeader className="pb-4">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription className="min-h-[2.5rem]">{plan.description}</CardDescription>

              <div className="mt-4 space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.priceDetail}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold ${tier.tierColor === 'amber' ? 'text-amber-500' : 'text-primary'}`}
                  >
                    {plan.commission}
                  </span>
                  <span className="text-sm text-muted-foreground">commission per booking</span>
                </div>

                {plan.savingsText && (
                  <div
                    className={`inline-block rounded-full ${colors.savings} px-3 py-1 text-xs font-semibold text-white`}
                  >
                    {plan.savingsText}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col space-y-4">
              <ul className="flex-1 space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className={`mt-0.5 h-5 w-5 shrink-0 ${colors.check}`} />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className="w-full"
                variant={plan.recommended ? 'default' : 'outline'}
                size="lg"
              >
                <Link href={plan.cta.href}>{plan.cta.text}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
