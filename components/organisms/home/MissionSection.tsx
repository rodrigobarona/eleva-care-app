import React from 'react';
import { Button } from '@/components/ui/button'; // Adjust the import path as necessary
import { ChevronRight } from 'lucide-react';
import FadeInSection from '../ui/FadeInSection';

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
      <section className="w-full bg-elevaNeutral-100 px-6 py-12 md:py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tighter text-elevaPrimary sm:text-4xl md:text-5xl">
              {title}
            </h2>
            <p className="mt-4 text-xl text-elevaNeutral-900">{subtitle}</p>
          </div>
          <div className="grid items-center gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-6 text-xl text-elevaNeutral-900">{description}</p>
              <h3 className="mb-2 text-2xl font-bold text-elevaPrimary">{vision.title}</h3>
              <p className="mb-6 text-xl text-elevaNeutral-900">{vision.description}</p>

              <Button className="mt-4 bg-[#0d6c70] text-elevaNeutral-100 hover:bg-[#0d6c70]/90">
                {cta}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="rounded-lg bg-[#f0f8f8] p-6 text-center">
                  <div className="text-3xl font-bold text-elevaPrimary">{stat.value}</div>
                  <div className="text-elevaNeutral-900">{stat.label}</div>
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
