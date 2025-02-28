import { Button } from '@/components/atoms/button';
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
      <section className="bg-elevaNeutral-100 w-full px-6 py-12 md:py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-elevaPrimary text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              {title}
            </h2>
            <p className="text-elevaNeutral-900 mt-4 text-xl">{subtitle}</p>
          </div>
          <div className="grid items-center gap-6 lg:grid-cols-2">
            <div>
              <p className="text-elevaNeutral-900 mb-6 text-xl">{description}</p>
              <h3 className="text-elevaPrimary mb-2 text-2xl font-bold">{vision.title}</h3>
              <p className="text-elevaNeutral-900 mb-6 text-xl">{vision.description}</p>

              <Button className="text-elevaNeutral-100 mt-4 bg-[#0d6c70] hover:bg-[#0d6c70]/90">
                {cta}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="rounded-lg bg-[#f0f8f8] p-6 text-center">
                  <div className="text-elevaPrimary text-3xl font-bold">{stat.value}</div>
                  <div className="text-elevaNeutral-900">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
      </div>
    </section>
  );
};

export default MissionSection;
