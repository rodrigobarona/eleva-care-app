import { Button } from '@/components/atoms/button';
import FadeInSection from '@/components/atoms/FadeInSection';
import { Podcast } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type React from 'react';

interface PodcastSectionProps {
  title: string;
  subtitle: string;
  description: string;
  cta: string;
}

const PodcastSection: React.FC<PodcastSectionProps> = ({ title, subtitle, description, cta }) => {
  return (
    <FadeInSection>
      <section
        id="podcast"
        className="from-elevaPrimary via-elevaPrimary-light to-elevaPrimary lg:rounded-5xl mx-2 mt-20 rounded-3xl bg-[linear-gradient(145deg,var(--tw-gradient-stops))] from-[5%] via-[20%] to-[45%] px-6 py-12 lg:mt-40 lg:bg-[linear-gradient(115deg,var(--tw-gradient-stops))] lg:from-[28%] lg:via-[70%] lg:to-[95%] lg:pb-24 lg:pt-20"
      >
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <div className="flex flex-col items-center gap-4 lg:flex-row-reverse lg:gap-16">
            <div className="-mt-24 w-full flex-auto justify-end lg:-mt-40 lg:w-2/5">
              <div className="bg-elevaNeutral-100/15 ring-elevaNeutral-900/5 lg:rounded-4xl -m-4 aspect-square rounded-xl shadow-[inset_0_0_2px_1px_#ffffff4d] ring-1 max-lg:mx-auto max-lg:max-w-xs">
                <div className="shadow-elevaNeutral-900/5 lg:rounded-4xl rounded-xl p-2 shadow-md">
                  <div className="outline-elevaNeutral-900/10 overflow-hidden rounded-xl shadow-2xl outline outline-1 -outline-offset-1 lg:rounded-3xl">
                    <Image
                      src="/img/Elevating-Women-Health-Podcast.png"
                      alt="Eleva Care Podcast"
                      width={1200}
                      height={1200}
                      className="aspect-square rounded-lg shadow-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-10 w-full flex-auto space-y-4 lg:mt-0 lg:w-3/5">
              <div className="mb-6">
                <h2 className="text-elevaNeutral-100 data-[dark]:text-elevaNeutral-100/60 font-mono text-xs/5 font-semibold uppercase tracking-widest">
                  {subtitle}
                </h2>
                <h3 className="text-elevaNeutral-100 data-[dark]:text-elevaNeutral-100 mt-2 text-pretty font-serif text-4xl font-light tracking-tighter sm:text-6xl">
                  {title}
                </h3>
              </div>
              <p className="text-elevaNeutral-100 mt-8 text-pretty text-base/5 font-light">
                {description}
              </p>
              <div className="pt-4">
                <Button
                  className="bg-elevaHighlight-red text-elevaNeutral-100 hover:bg-elevaHighlight-purple h-9 rounded-full p-6 shadow-none"
                  asChild
                >
                  <Link
                    href="https://podcasters.spotify.com/pod/show/elevacare"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Podcast className="mr-2 h-4 w-4" />
                    {cta}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </FadeInSection>
  );
};

export default PodcastSection;
