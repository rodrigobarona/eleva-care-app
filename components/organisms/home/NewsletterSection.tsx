import FadeInSection from '@/components/atoms/FadeInSection';
import type React from 'react';

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
      <section id="newsletter" className="bg-elevaNeutral-100 w-full px-6 py-12 md:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <div className="mx-auto max-w-xl text-center">
            <div className="mb-6">
              <h2 className="text-elevaNeutral-900/70 data-[dark]:text-elevaNeutral-900/60 font-mono text-xs/5 font-semibold uppercase tracking-widest">
                {subtitle}
              </h2>
              <h3 className="text-elevaPrimary data-[dark]:text-elevaNeutral-100 mt-2 text-balance font-serif text-4xl font-light tracking-tighter lg:text-6xl">
                {title}
              </h3>
            </div>
            <p className="text-elevaNeutral-900 text-balance text-base/5 font-light lg:text-xl">
              {description}
            </p>

            <div className="mt-8 flex gap-2">
              <iframe
                title="Newsletter"
                src="https://embeds.beehiiv.com/294b9d43-62b2-47e4-9757-2e5ef82c204d?slim=true"
                data-test-id="beehiiv-embed"
                height="52"
                width="100%"
                aria-label="newsletter"
                aria-labelledby="behiiv"
                style={{
                  margin: 0,
                  borderRadius: '0px',
                  backgroundColor: 'transparent',
                }} // Updated to object
              />
            </div>
            <p className="text-elevaNeutral-900/60 pt-2 text-xs">{privacy}</p>
          </div>
        </div>
      </section>
    </FadeInSection>
  );
};

export default NewsletterSection;
