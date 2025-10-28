'use client';

import { Button } from '@/components/atoms/button';
import { PlatformDisclaimer } from '@/components/molecules/PlatformDisclaimer';
import { ClipboardList } from 'lucide-react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

// Dynamically import VideoPlayer to reduce initial bundle size
const VideoPlayer = dynamic(
  () => import('@/components/molecules/videoPlayer').then((mod) => ({ default: mod.VideoPlayer })),
  {
    ssr: false,
    loading: () => null,
  },
);

const Hero = () => {
  const t = useTranslations('hero');

  return (
    <section
      className="lg:rounded-5xl relative m-2 overflow-hidden rounded-2xl bg-eleva-neutral-900"
      data-component-name="hero"
    >
      {/* Priority load poster image for instant FCP */}
      <Image
        src="/img/videos/eleva-care-intro-banner-poster.webp"
        alt="Eleva Care Hero"
        width={1920}
        height={1080}
        priority
        quality={90}
        className="lg:rounded-5xl absolute rounded-2xl object-cover"
        sizes="100vw"
      />
      {/* Load video after initial render */}
      <VideoPlayer
        src="img/videos/eleva-care-intro-banner.webm"
        width={1920}
        height={1080}
        playsInline
        autoPlay
        muted
        loop
        controls={false}
        preload="none"
        poster="img/videos/eleva-care-intro-banner-poster.webp"
        className="lg:rounded-5xl absolute rounded-2xl object-cover"
      />
      <div className="absolute z-0 h-full w-full bg-eleva-neutral-900/40" />
      <div className="relative px-4 lg:px-6">
        <div className="z-20 mx-auto flex max-w-2xl flex-col justify-end pt-44 lg:max-w-7xl lg:justify-between lg:pt-72">
          <div>
            <h1 className="max-w-5xl text-balance font-serif text-5xl/[0.9] font-light tracking-tight text-eleva-neutral-100 lg:text-8xl/[.9]">
              <ReactMarkdown>{t('title')}</ReactMarkdown>
            </h1>
          </div>
          <div>
            <p className="mb-4 mt-8 max-w-lg text-balance font-sans text-xl/6 font-light text-eleva-neutral-100 lg:mb-8 lg:mt-16 lg:text-2xl/7">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex flex-col justify-between lg:mb-20 lg:flex-row">
            <div className="items-center gap-x-4 sm:flex">
              <div>
                <Button
                  asChild
                  className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-full border border-transparent bg-eleva-neutral-100 px-8 py-[1.3rem] text-base font-semibold text-eleva-neutral-900 shadow-md hover:bg-eleva-neutral-100/70 lg:w-min lg:py-6 lg:text-lg lg:font-bold"
                >
                  <Link href="#experts">{t('cta2')}</Link>
                </Button>
              </div>
              <div className="mt-2 max-w-xs text-balance text-center text-xs font-light text-eleva-neutral-100/90 lg:mt-0 lg:text-left lg:text-sm/[1.3]">
                {t('disclaimer')}{' '}
                <PlatformDisclaimer>
                  <button className="inline-flex items-center underline decoration-eleva-neutral-100/50 underline-offset-2 transition-colors hover:text-eleva-neutral-100 hover:decoration-eleva-neutral-100">
                    {t('disclaimerLink')}
                  </button>
                </PlatformDisclaimer>
              </div>
            </div>
            <div>
              <Link href="https://patimota.typeform.com/to/XNQHJbgT" target="_blank">
                <Button className="mb-7 mt-5 inline-flex w-full items-center justify-center whitespace-nowrap rounded-full border border-eleva-neutral-100/30 bg-eleva-neutral-100/40 p-5 text-sm font-medium text-eleva-neutral-900 shadow-sm hover:bg-eleva-neutral-100/50 md:w-auto lg:my-0 lg:bg-eleva-neutral-100/10 lg:p-6 lg:text-eleva-neutral-100 lg:shadow-none lg:hover:text-eleva-neutral-900">
                  <ClipboardList className="mr-2 h-5 w-5" />
                  {t('cta1')}
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
