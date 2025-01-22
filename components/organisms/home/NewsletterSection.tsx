import React from 'react';
import FadeInSection from '@/components/ui/FadeInSection';

interface NewsletterSectionProps {
  title: string;
  description: string;
  placeholder: string;
  subtitle: string;
  cta: string;
  privacy: string;
}

const NewsletterSection: React.FC<NewsletterSectionProps> = ({
  title,
  description,
  subtitle,
  privacy,
}) => {
  return (
    <FadeInSection>
      <section id="newsletter" className="w-full bg-elevaNeutral-100 px-6 py-12 md:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <div className="mx-auto max-w-xl text-center">
            <div className="mb-6">
              <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-elevaNeutral-900/70 data-[dark]:text-elevaNeutral-900/60">
                {subtitle}
              </h2>
              <h3 className="mt-2 text-balance font-serif text-4xl font-light tracking-tighter text-elevaPrimary data-[dark]:text-elevaNeutral-100 lg:text-6xl">
                {title}
              </h3>
            </div>
            <p className="text-balance text-base/5 font-light text-elevaNeutral-900 lg:text-xl">
              {description}
            </p>

            <div className="mt-8 flex gap-2">
              <iframe
                src="https://embeds.beehiiv.com/294b9d43-62b2-47e4-9757-2e5ef82c204d?slim=true"
                data-test-id="beehiiv-embed"
                height="52"
                width="100%"
                aria-label="newsletter"
                aria-labelledby="behiiv"
                style={{ margin: 0, borderRadius: '0px', backgroundColor: 'transparent' }} // Updated to object
              ></iframe>
            </div>
            <p className="pt-2 text-xs text-elevaNeutral-900/60">{privacy}</p>
          </div>
        </div>
      </section>
    </FadeInSection>
  );
};

export default NewsletterSection;
