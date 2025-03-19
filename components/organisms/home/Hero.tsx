'use client';

import { Button } from '@/components/atoms/button';
import { useLanguage } from '@/components/molecules/LanguageProvider';
import { VideoPlayer } from '@/components/molecules/videoPlayer';
import { translations as br } from '@/public/locales/br';
import { translations as en } from '@/public/locales/en';
import { translations as es } from '@/public/locales/es';
import { translations as pt } from '@/public/locales/pt';
import { ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import ReactMarkdown from 'react-markdown';

const languageMap = {
  en,
  br,
  pt,
  es,
};

const Hero = () => {
  const { lang } = useLanguage();
  const t = languageMap[lang];

  return (
    <section
      className="lg:rounded-5xl bg-eleva-neutral-900 relative m-2 overflow-hidden rounded-2xl"
      data-component-name="hero"
    >
      <Suspense fallback={<p>Loading video...</p>}>
        <VideoPlayer
          src="/videos/eleva-care-intro-banner.webm"
          width={1920}
          height={1080}
          playsInline={true}
          autoPlay={true}
          muted={true}
          loop={true}
          controls={false}
          preload="auto"
          className="lg:rounded-5xl absolute rounded-2xl object-cover"
        />
      </Suspense>
      <div className="bg-eleva-neutral-900/40 absolute z-0 h-full w-full" />
      <div className="relative px-4 lg:px-6">
        <div className="z-20 mx-auto flex max-w-2xl flex-col justify-end pt-44 lg:max-w-7xl lg:justify-between lg:pt-72">
          <div>
            <h1 className="text-eleva-neutral-100 max-w-5xl font-serif text-5xl/[0.9] font-light tracking-tight text-balance lg:text-8xl/[.9]">
              <ReactMarkdown>{t.hero.title}</ReactMarkdown>
            </h1>
          </div>
          <div>
            <p className="text-eleva-neutral-100 mt-8 mb-12 max-w-lg font-sans text-xl/6 font-light text-balance lg:mt-16 lg:mb-8 lg:text-2xl/7">
              {t.hero.subtitle}
            </p>
          </div>
          <div className="flex flex-col justify-between lg:mb-20 lg:flex-row">
            <div className="items-center gap-x-4 sm:flex">
              <div>
                <Button
                  asChild
                  className="bg-eleva-neutral-100 text-eleva-neutral-900 hover:bg-eleva-neutral-100/70 inline-flex w-full items-center justify-center rounded-full border border-transparent px-8 py-[1.3rem] text-base font-semibold whitespace-nowrap shadow-md lg:w-min lg:py-6 lg:text-lg lg:font-bold"
                  data-mode="dark"
                >
                  <Link href="#experts">{t.hero.cta2}</Link>
                </Button>
              </div>
              <div className="text-eleva-neutral-100 mt-2 text-center text-xs font-normal lg:mt-0 lg:text-left lg:text-sm/[1.3] lg:font-medium">
                {t.hero.cta2Help} <br className="hidden sm:inline" />
                {t.hero.cta2Help2}
              </div>
            </div>
            <div>
              <Link href="https://patimota.typeform.com/to/XNQHJbgT" target="_blank">
                <Button className="border-eleva-neutral-100/30 bg-eleva-neutral-100/40 text-eleva-neutral-900 hover:bg-eleva-neutral-100/50 lg:bg-eleva-neutral-100/10 lg:text-eleva-neutral-100 lg:hover:text-eleva-neutral-900 mt-5 mb-7 inline-flex w-full items-center justify-center rounded-full border p-5 text-sm font-medium whitespace-nowrap shadow-sm md:w-auto lg:my-0 lg:p-6 lg:shadow-none">
                  <ClipboardList className="mr-2 h-5 w-5" />
                  {t.hero.cta1}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
