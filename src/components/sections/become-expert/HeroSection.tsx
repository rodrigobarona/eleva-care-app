import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface HeroSectionProps {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  ctaButton: string;
  signInButton: string;
  features: string;
}

export default function HeroSection({
  badge,
  title,
  subtitle,
  description,
  ctaButton,
  signInButton,
  features,
}: HeroSectionProps) {
  return (
    <section className="relative container mx-auto px-4 py-20 md:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <div className="bg-primary/10 text-primary mb-6 inline-block rounded-full px-4 py-2 text-sm font-medium">
          <Sparkles className="mr-2 inline h-4 w-4" />
          {badge}
        </div>

        <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          {title}
          <br />
          <span className="from-primary bg-linear-to-r to-purple-600 bg-clip-text text-transparent">
            {subtitle}
          </span>
        </h1>

        <p className="text-muted-foreground mb-8 text-lg md:text-xl">{description}</p>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="text-lg">
            <Link href="/apply">
              {ctaButton} <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="text-lg">
            <Link href="/login">{signInButton}</Link>
          </Button>
        </div>

        <p className="text-muted-foreground mt-6 text-sm">{features}</p>
      </div>
    </section>
  );
}
