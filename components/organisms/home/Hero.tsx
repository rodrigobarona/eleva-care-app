'use client';

import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTrigger,
} from '@/components/molecules/dialog';
import { useLanguage } from '@/components/molecules/LanguageProvider';
import VideoPlayer from '@/components/molecules/videoPlayer';
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
      className="lg:rounded-5xl relative m-2 overflow-hidden rounded-2xl bg-eleva-neutral-900"
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
      <div className="absolute z-0 h-full w-full bg-eleva-neutral-900/40" />
      <div className="relative px-4 lg:px-6">
        <div className="z-20 mx-auto flex max-w-2xl flex-col justify-end pt-44 lg:max-w-7xl lg:justify-between lg:pt-72">
          <div>
            <h1 className="max-w-5xl text-balance font-serif text-5xl/[0.9] font-light tracking-tight text-eleva-neutral-100 lg:text-8xl/[.9]">
              <ReactMarkdown>{t.hero.title}</ReactMarkdown>
            </h1>
          </div>
          <div>
            <p className="mb-12 mt-8 max-w-lg text-balance font-sans text-xl/6 font-light text-eleva-neutral-100 lg:mb-8 lg:mt-16 lg:text-2xl/7">
              {t.hero.subtitle}
            </p>
          </div>
          <div className="flex flex-col justify-between lg:mb-20 lg:flex-row">
            <div className="items-center gap-x-4 sm:flex">
              <div>
                <Button
                  asChild
                  className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-full border border-transparent bg-eleva-neutral-100 px-8 py-[1.3rem] text-base font-semibold text-eleva-neutral-900 shadow-md hover:bg-eleva-neutral-100/70 lg:w-min lg:py-6 lg:text-lg lg:font-bold"
                  data-mode="dark"
                >
                  <Link href="/patimota">{t.hero.cta2}</Link>
                </Button>
              </div>
              <div className="mt-2 text-center text-xs font-normal text-eleva-neutral-100 lg:mt-0 lg:text-left lg:text-sm/[1.3] lg:font-medium">
                {t.hero.cta2Help} <br className="hidden sm:inline" />
                {t.hero.cta2Help2}
              </div>
            </div>
            <div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="mb-7 mt-5 inline-flex w-full items-center justify-center whitespace-nowrap rounded-full border border-eleva-neutral-100/30 bg-eleva-neutral-100/40 p-5 text-sm font-medium text-eleva-neutral-900 shadow-sm hover:bg-eleva-neutral-100/50 md:w-auto lg:my-0 lg:bg-eleva-neutral-100/10 lg:p-6 lg:text-eleva-neutral-100 lg:shadow-none lg:hover:text-eleva-neutral-900">
                    <ClipboardList className="mr-2 h-5 w-5" />
                    {t.hero.cta1}
                  </Button>
                </DialogTrigger>
                <DialogPortal>
                  <DialogOverlay className="bg-green-500/20">
                    <DialogContent className="h-screen w-screen">
                      <iframe
                        src="https://patimota.typeform.com/to/XNQHJbgT?utm_source=eleva-care&utm_medium=website&utm_campaign=ongoing&utm_term=physical%2Btherapy&utm_content=temp_home_btn"
                        width="100%"
                        height="100%"
                        title="Formulário de contato"
                      />
                    </DialogContent>
                  </DialogOverlay>
                </DialogPortal>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
