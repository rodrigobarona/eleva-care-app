import { Button } from '@/components/atoms/button';
import FadeInSection from '@/components/atoms/FadeInSection';
import { ChevronRight } from 'lucide-react';
import type React from 'react';

type MissionSectionProps = {
  title: string;
  subtitle: string;
  description: string;
  vision: {
    title: string;
    description: string;
  };
  cta: string;
  stats: { value: string; label: string }[];
};

const MissionSection: React.FC<MissionSectionProps> = ({
  title,
  subtitle,
  description,
  vision,
  cta,
  stats,
}) => {
  return (
    <FadeInSection>
      <section className="w-full bg-eleva-neutral-100 px-6 py-12 md:py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <div className="mb-12">
            <h2 className="font-mono text-xs/5 font-normal uppercase tracking-widest text-eleva-neutral-900/70 data-[dark]:text-eleva-neutral-900/60">
              {title}
            </h2>
            <h3 className="mt-2 text-pretty font-serif text-4xl font-light tracking-tighter text-eleva-primary data-[dark]:text-eleva-neutral-100 sm:text-6xl">
              {subtitle}
            </h3>
          </div>
          <p className="mt-6 text-balance text-base font-light text-eleva-neutral-900 lg:text-xl">
            {description}
          </p>
          <div className="mt-12 grid items-center gap-6 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-2xl font-bold text-eleva-primary">{vision.title}</h4>
              <p className="mb-6 text-xl text-eleva-neutral-900">{vision.description}</p>

              <Button className="mt-4 bg-[#0d6c70] text-eleva-neutral-100 hover:bg-[#0d6c70]/90">
                {cta}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="rounded-lg bg-[#f0f8f8] p-6 text-center">
                  <div className="text-3xl font-bold text-eleva-primary">{stat.value}</div>
                  <div className="text-eleva-neutral-900">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </FadeInSection>
  );
};

export default MissionSection;
